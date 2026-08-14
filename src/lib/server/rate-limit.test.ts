import { describe, expect, it, beforeAll, vi } from 'vitest';
import { join } from 'path';
import { getDB } from '$lib/server/d1-compat';
import { consumeRateLimitBucket, pruneExpiredRateLimitBuckets } from '$lib/server/db/rate-limit';
import { checkRateLimit } from '$lib/server/rate-limit';

describe('consumeRateLimitBucket', () => {
	beforeAll(() => {
		process.env.SHIVWORKS_DB_MODE = 'sqlite';
		process.env.DATABASE_PATH = join(process.cwd(), 'data', 'rate-limit-test.db');
	});

	it('allows requests up to the limit within a window', async () => {
		const db = getDB();
		const key = `test:allow:${Date.now()}`;

		for (let i = 1; i <= 3; i++) {
			const state = await consumeRateLimitBucket(db, {
				bucketKey: key,
				limit: 3,
				windowSeconds: 60
			});
			expect(state.requestCount).toBe(i);
			expect(state.allowed).toBe(true);
		}

		const denied = await consumeRateLimitBucket(db, {
			bucketKey: key,
			limit: 3,
			windowSeconds: 60
		});
		expect(denied.requestCount).toBe(4);
		expect(denied.allowed).toBe(false);
	});

	it('resets the counter when the window expires', async () => {
		const db = getDB();
		const key = `test:reset:${Date.now()}`;
		const nowSeconds = Math.floor(Date.now() / 1000);

		await db
			.prepare(
				`INSERT INTO rate_limit_buckets (bucket_key, window_end, request_count, updated_at)
				 VALUES (?, ?, ?, ?)`
			)
			.bind(key, nowSeconds - 1, 99, Date.now())
			.run();

		const state = await consumeRateLimitBucket(db, {
			bucketKey: key,
			limit: 5,
			windowSeconds: 60
		});

		expect(state.requestCount).toBe(1);
		expect(state.allowed).toBe(true);
	});

	it('does not lose increments under concurrent load', async () => {
		const db = getDB();
		const key = `test:concurrent:${Date.now()}`;
		const limit = 5;
		const concurrency = 25;

		const results = await Promise.all(
			Array.from({ length: concurrency }, () =>
				consumeRateLimitBucket(db, {
					bucketKey: key,
					limit,
					windowSeconds: 60
				})
			)
		);

		const allowed = results.filter((result) => result.allowed);
		const denied = results.filter((result) => !result.allowed);

		expect(allowed).toHaveLength(limit);
		expect(denied).toHaveLength(concurrency - limit);

		const final = await db
			.prepare(`SELECT request_count FROM rate_limit_buckets WHERE bucket_key = ?`)
			.bind(key)
			.first<{ request_count: number }>();

		expect(Number(final?.request_count)).toBe(concurrency);
	});
});

describe('checkRateLimit', () => {
	beforeAll(() => {
		process.env.SHIVWORKS_DB_MODE = 'sqlite';
		process.env.DATABASE_PATH = join(process.cwd(), 'data', 'rate-limit-test.db');
	});

	it('fails closed when the database layer throws', async () => {
		const db = {
			prepare: () => ({
				bind: () => ({
					first: vi.fn().mockRejectedValue(new Error('d1_unavailable'))
				})
			})
		};

		const result = await checkRateLimit({
			db: db as never,
			key: 'rl:test:fail-closed',
			limit: 5,
			windowSeconds: 60,
			auditDenials: false
		});

		expect(result.allowed).toBe(false);
		expect(result.retryAfterSeconds).toBeGreaterThan(0);
	});

	it('records denial audit rows when limited', async () => {
		const db = getDB();
		const key = `test:audit:${Date.now()}`;

		for (let i = 0; i < 2; i++) {
			await checkRateLimit({
				db,
				key,
				limit: 1,
				windowSeconds: 60
			});
		}

		const denial = await db
			.prepare(
				`SELECT bucket_key, request_count, limit_value
				 FROM rate_limit_denials
				 WHERE bucket_key = ?
				 ORDER BY created_at DESC
				 LIMIT 1`
			)
			.bind(key)
			.first<{ bucket_key: string; request_count: number; limit_value: number }>();

		expect(denial?.bucket_key).toBe(key);
		expect(Number(denial?.request_count)).toBe(2);
		expect(Number(denial?.limit_value)).toBe(1);
	});
});

describe('pruneExpiredRateLimitBuckets', () => {
	beforeAll(() => {
		process.env.SHIVWORKS_DB_MODE = 'sqlite';
		process.env.DATABASE_PATH = join(process.cwd(), 'data', 'rate-limit-test.db');
	});

	it('deletes buckets past the grace window', async () => {
		const db = getDB();
		const staleKey = `test:stale:${Date.now()}`;
		const nowSeconds = Math.floor(Date.now() / 1000);

		await db
			.prepare(
				`INSERT INTO rate_limit_buckets (bucket_key, window_end, request_count, updated_at)
				 VALUES (?, ?, ?, ?)`
			)
			.bind(staleKey, nowSeconds - 100_000, 3, Date.now())
			.run();

		const pruned = await pruneExpiredRateLimitBuckets(db, 86_400);
		expect(pruned).toBeGreaterThanOrEqual(1);

		const row = await db
			.prepare(`SELECT 1 FROM rate_limit_buckets WHERE bucket_key = ?`)
			.bind(staleKey)
			.first();

		expect(row).toBeNull();
	});
});
