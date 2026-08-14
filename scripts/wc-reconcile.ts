#!/usr/bin/env node
// scripts/wc-reconcile.ts
// Confirm the WC → D1 bulk migration landed cleanly. Compares the CSV row count
// (source of truth from WC) against what D1 actually has, surfaces missing
// or extra rows, and reports claim status.
//
// Usage:
//   pnpm tsx scripts/wc-reconcile.ts --csv ./buyers.csv [--remote]
//
// Without --remote it queries local dev D1 via wrangler. With --remote it
// queries the production D1 binding. Either way it shells out to wrangler.
//
// Output sections:
//   1. Totals — CSV count vs D1 count of member_imports rows with source_ref LIKE 'wc:%'
//   2. Missing in D1 — emails in CSV but not in D1 (failed UPSERTs, must investigate)
//   3. Extra in D1 — wc:* imports in D1 with no matching CSV row (likely test data or webhook-arrived after extract)
//   4. Claim status — how many of the imports are claimed (a member signed up) vs orphan
//   5. Tier breakdown — count of bronze vs vip in CSV and D1

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const { values: args } = parseArgs({
	options: {
		csv: { type: 'string' },
		remote: { type: 'boolean', default: false },
		db: { type: 'string', default: 'shivworks-network-db' }
	},
	strict: true
});

if (!args.csv) {
	console.error('Usage: wc-reconcile.ts --csv <buyers.csv> [--remote]');
	process.exit(1);
}

const isRemote = args.remote ?? false;
const dbName = args.db ?? 'shivworks-network-db';
const remoteFlag = isRemote ? '--remote' : '--local';

function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let cur = '';
	let inQ = false;
	for (const ch of line + ',') {
		if (ch === '"') {
			inQ = !inQ;
			continue;
		}
		if (ch === ',' && !inQ) {
			fields.push(cur);
			cur = '';
			continue;
		}
		cur += ch;
	}
	return fields.map((s) => s.trim().replace(/^"|"$/g, ''));
}

function normalizeHeader(h: string): string {
	return h
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

interface CsvRow {
	email: string;
	tier: string;
}

const raw = readFileSync(resolve(process.cwd(), args.csv!), 'utf8');
const lines = raw
	.replace(/\r\n/g, '\n')
	.replace(/\r/g, '\n')
	.split('\n')
	.filter((l) => l.trim());
const headers = parseCsvLine(lines[0]).map(normalizeHeader);
const iEmail = headers.indexOf('email');
const iTier = headers.indexOf('tier');
if (iEmail < 0 || iTier < 0) {
	console.error('CSV must have email and tier columns');
	process.exit(1);
}

const csvRows: CsvRow[] = [];
for (let i = 1; i < lines.length; i++) {
	const f = parseCsvLine(lines[i]);
	const email = (f[iEmail] ?? '').toLowerCase();
	const tier = (f[iTier] ?? '').toLowerCase();
	if (email) csvRows.push({ email, tier });
}

function d1Query<T = Record<string, unknown>>(sql: string): T[] {
	const cmd = `wrangler d1 execute ${dbName} ${remoteFlag} --json --command="${sql.replace(/"/g, '\\"')}"`;
	const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	try {
		const parsed = JSON.parse(out);
		// wrangler emits an array with one result object containing results array
		return (parsed[0]?.results ?? []) as T[];
	} catch (err) {
		console.error('Failed to parse wrangler JSON output:', err);
		console.error('Raw:', out.slice(0, 500));
		process.exit(1);
	}
}

console.log(`\nReconciling against ${isRemote ? 'REMOTE' : 'LOCAL'} D1 (${dbName})…\n`);

// ─── 1. Totals ────────────────────────────────────────────────────────────────
const d1Rows = d1Query<{ email: string; tier: string; claimed_at: string | null }>(
	`SELECT email, tier, claimed_at FROM member_imports WHERE source_ref LIKE 'wc:%' OR source_ref IS NULL`
);

const d1ByEmail = new Map(d1Rows.map((r) => [r.email.toLowerCase(), r]));
const csvByEmail = new Map(csvRows.map((r) => [r.email, r]));

console.log('── 1. Totals');
console.log(`   CSV rows:    ${csvRows.length}`);
console.log(`   D1 rows:     ${d1Rows.length}`);
const delta = d1Rows.length - csvRows.length;
console.log(`   Δ:           ${delta > 0 ? '+' : ''}${delta}`);

// ─── 2. Missing in D1 ─────────────────────────────────────────────────────────
const missing = csvRows.filter((r) => !d1ByEmail.has(r.email));
console.log(`\n── 2. Missing in D1 (CSV email not found): ${missing.length}`);
for (const m of missing.slice(0, 20)) console.log(`     ${m.email}  (tier=${m.tier})`);
if (missing.length > 20) console.log(`     …and ${missing.length - 20} more`);

// ─── 3. Extra in D1 ───────────────────────────────────────────────────────────
const extra = d1Rows.filter((r) => !csvByEmail.has(r.email.toLowerCase()));
console.log(`\n── 3. Extra in D1 (D1 row not in CSV): ${extra.length}`);
console.log('     (likely test data, manual entries, or webhook-arrived after extract)');
for (const e of extra.slice(0, 20))
	console.log(`     ${e.email}  (tier=${e.tier}, claimed=${e.claimed_at ? 'yes' : 'no'})`);
if (extra.length > 20) console.log(`     …and ${extra.length - 20} more`);

// ─── 4. Claim status ──────────────────────────────────────────────────────────
const claimed = d1Rows.filter((r) => r.claimed_at).length;
const unclaimed = d1Rows.length - claimed;
console.log('\n── 4. Claim status (members who completed Clerk signup)');
console.log(
	`     Claimed:    ${claimed}  (${d1Rows.length > 0 ? Math.round((claimed / d1Rows.length) * 100) : 0}%)`
);
console.log(`     Unclaimed:  ${unclaimed}  (waiting for the buyer to sign up)`);

// ─── 5. Tier breakdown ────────────────────────────────────────────────────────
const csvBronze = csvRows.filter((r) => r.tier === 'bronze').length;
const csvVip = csvRows.filter((r) => r.tier === 'vip').length;
const d1Bronze = d1Rows.filter((r) => r.tier === 'bronze').length;
const d1Vip = d1Rows.filter((r) => r.tier === 'vip').length;
console.log('\n── 5. Tier breakdown');
console.log(`     CSV:  bronze=${csvBronze}  vip=${csvVip}`);
console.log(`     D1:   bronze=${d1Bronze}  vip=${d1Vip}`);

// ─── Verdict ─────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────');
const ok = missing.length === 0;
console.log(
	ok
		? '✓ Reconciliation OK — every CSV row exists in D1.'
		: `✗ Reconciliation INCOMPLETE — ${missing.length} CSV rows missing from D1.`
);
process.exit(ok ? 0 : 1);
