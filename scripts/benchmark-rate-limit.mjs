#!/usr/bin/env node
/**
 * Compares KV-style read-modify-write (race-prone) vs D1 atomic UPSERT under concurrency.
 *
 * Usage: node scripts/benchmark-rate-limit.mjs [concurrency] [limit]
 */
import { existsSync, unlinkSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

const concurrency = Number(process.argv[2] ?? 50);
const limit = Number(process.argv[3] ?? 10);
const windowSeconds = 60;
const dbPath = join(process.cwd(), 'data', 'rate-limit-benchmark.db');

function resetDb() {
	if (existsSync(dbPath)) unlinkSync(dbPath);
	const db = new Database(dbPath);
	applyMigrations(db);
	db.close();
}

function applyMigrations(db) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS rate_limit_buckets (
			bucket_key TEXT PRIMARY KEY,
			window_end INTEGER NOT NULL,
			request_count INTEGER NOT NULL DEFAULT 0,
			updated_at INTEGER NOT NULL
		);
	`);
	const migrationsDir = join(process.cwd(), 'migrations');
	const migration = '0038_rate_limit_buckets.sql';
	const sql = readFileSync(join(migrationsDir, migration), 'utf-8');
	db.exec(sql);
	db.prepare('INSERT OR IGNORE INTO _migrations (name, applied_at) VALUES (?, ?)').run(
		migration,
		Date.now()
	);
}

function kvRaceConsume(key) {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const store = kvRaceConsume.store;
	const raw = store.get(key);
	let state;
	if (!raw) {
		state = { count: 1, windowEnd: nowSeconds + windowSeconds };
	} else {
		const parsed = JSON.parse(raw);
		if (parsed.windowEnd <= nowSeconds) {
			state = { count: 1, windowEnd: nowSeconds + windowSeconds };
		} else {
			state = { count: parsed.count + 1, windowEnd: parsed.windowEnd };
		}
	}
	store.set(key, JSON.stringify(state));
	return state.count <= limit;
}
kvRaceConsume.store = new Map();

/** Simulates N parallel workers that all read the same count before any write lands. */
function simulateKvParallelRace(concurrency, limitValue) {
	let storedCount = 0;
	const reads = Array.from({ length: concurrency }, () => storedCount);
	const decisions = reads.map((count) => count + 1 <= limitValue);
	// All writers persist the same incremented value — lost updates.
	storedCount = reads[0] + 1;
	return {
		allowed: decisions.filter(Boolean).length,
		finalStoredCount: storedCount
	};
}

const atomicUpsertSql = `
	INSERT INTO rate_limit_buckets (bucket_key, window_end, request_count, updated_at)
	VALUES (@key, @windowEnd, 1, @updatedAt)
	ON CONFLICT(bucket_key) DO UPDATE SET
		request_count = CASE
			WHEN rate_limit_buckets.window_end <= @now THEN 1
			ELSE rate_limit_buckets.request_count + 1
		END,
		window_end = CASE
			WHEN rate_limit_buckets.window_end <= @now THEN excluded.window_end
			ELSE rate_limit_buckets.window_end
		END,
		updated_at = excluded.updated_at
	RETURNING request_count
`;

function d1AtomicConsume(db, key) {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const row = db.prepare(atomicUpsertSql).get({
		key,
		windowEnd: nowSeconds + windowSeconds,
		updatedAt: Date.now(),
		now: nowSeconds
	});
	return Number(row.request_count) <= limit;
}

function runBenchmark(label, fn) {
	const start = performance.now();
	const results = Array.from({ length: concurrency }, () => fn());
	const elapsed = performance.now() - start;
	const allowed = results.filter(Boolean).length;
	return { label, allowed, denied: concurrency - allowed, elapsedMs: elapsed.toFixed(2) };
}

resetDb();

const kvKey = 'rl:benchmark:kv';
kvRaceConsume.store = new Map();
const kvSequential = runBenchmark('KV sequential (no race)', () => kvRaceConsume(kvKey));
const kvParallel = simulateKvParallelRace(concurrency, limit);

const db = new Database(dbPath);
const d1Key = 'rl:benchmark:d1';
const d1Result = runBenchmark('D1 atomic UPSERT', () => d1AtomicConsume(db, d1Key));
const finalCount = db
	.prepare('SELECT request_count FROM rate_limit_buckets WHERE bucket_key = ?')
	.get(d1Key);
db.close();

console.log(
	JSON.stringify(
		{
			concurrency,
			limit,
			kvSequential,
			kvParallelRace: {
				label: 'KV parallel read-modify-write (simulated)',
				allowed: kvParallel.allowed,
				denied: concurrency - kvParallel.allowed,
				finalStoredCount: kvParallel.finalStoredCount,
				note: 'All workers read the same count; only one increment survives'
			},
			d1: { ...d1Result, finalRequestCount: Number(finalCount?.request_count ?? 0) },
			analysis: {
				kvBypass: `${kvParallel.allowed - limit} requests over limit under parallel race`,
				d1Strict: d1Result.allowed === limit ? 'limit enforced exactly' : 'unexpected'
			}
		},
		null,
		2
	)
);
