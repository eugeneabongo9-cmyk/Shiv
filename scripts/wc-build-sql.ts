#!/usr/bin/env node
// scripts/wc-build-sql.ts
// Compile a buyers CSV (output of wc-extract.ts) into a single SQL file that
// `wrangler d1 execute --remote --file=…` can apply atomically to production D1.
//
// Why this exists: scripts/bulk-import.ts uses the D1 client binding which
// only resolves inside the Worker runtime. For remote one-shot backfills the
// safe pattern is to emit a plain .sql file with idempotent UPSERTs, then run
// it through wrangler. The ON CONFLICT clauses mirror upsertImportedMemberProvision
// (src/lib/server/db/shivworks.ts:1734) so behavior is identical to the
// webhook path — the same row is overwritten on re-run.
//
// Usage:
//   pnpm tsx scripts/wc-build-sql.ts --in ./buyers.csv --out ./buyers.sql
//   wrangler d1 execute shivworks-network-db --remote --file=./buyers.sql
//
// Optional flags:
//   --batch-size 200   number of UPSERTs per BEGIN/COMMIT block (default 200)

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const { values: args } = parseArgs({
	options: {
		in: { type: 'string', short: 'i' },
		out: { type: 'string', short: 'o' },
		'batch-size': { type: 'string', default: '200' }
	},
	strict: true
});

if (!args.in || !args.out) {
	console.error('Usage: wc-build-sql.ts --in <buyers.csv> --out <buyers.sql>');
	process.exit(1);
}

const batchSize = Math.max(1, parseInt(args['batch-size'] ?? '200', 10));

function normalizeHeader(h: string): string {
	return h
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

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
	return fields;
}

function sqlEscape(v: string | number | null): string {
	if (v === null || v === undefined) return 'NULL';
	const s = String(v);
	return `'${s.replace(/'/g, "''")}'`;
}

interface BuyerRow {
	email: string;
	name: string;
	tier: 'bronze' | 'vip';
	wc_order_id: string;
	ordered_at: string;
}

const raw = readFileSync(resolve(process.cwd(), args.in!), 'utf8');
const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
if (lines.length < 2) {
	console.error('CSV needs a header row and at least one data row.');
	process.exit(1);
}

const headers = parseCsvLine(lines[0]).map(normalizeHeader);
const idx = (key: string, ...alts: string[]): number => {
	for (const k of [key, ...alts]) {
		const i = headers.indexOf(k);
		if (i >= 0) return i;
	}
	return -1;
};

const iEmail = idx('email', 'email_address', 'buyer_email', 'customer_email');
const iName = idx('name', 'full_name', 'customer_name', 'member_name');
const iFirst = idx('first_name', 'firstname');
const iLast = idx('last_name', 'lastname');
const iTier = idx(
	'tier',
	'membership_tier',
	'package',
	'product',
	'product_name',
	'plan',
	'variant',
	'order_item_name'
);
const iOrder = idx('wc_order_id', 'order_id', 'order_number', 'id');
const iOrderedAt = idx('ordered_at', 'date_created_gmt');

if (iEmail < 0 || iTier < 0) {
	console.error(
		`CSV must have at least "email" and "tier" (or "package"/"product") columns. Got: ${headers.join(', ')}`
	);
	process.exit(1);
}

const rows: BuyerRow[] = [];
const errors: string[] = [];
const seen = new Set<string>();

for (let li = 1; li < lines.length; li++) {
	const line = lines[li].trim();
	if (!line) continue;
	const f = parseCsvLine(line).map((s) => s.trim().replace(/^"|"$/g, ''));
	const email = (f[iEmail] ?? '').toLowerCase();
	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		errors.push(`Row ${li + 1}: invalid email "${email}"`);
		continue;
	}
	if (seen.has(email)) {
		errors.push(`Row ${li + 1}: duplicate email ${email} (skipped)`);
		continue;
	}
	const tierRaw = (f[iTier] ?? '').toLowerCase();
	let tier: 'bronze' | 'vip' | null = null;
	if (tierRaw === 'bronze' || tierRaw === 'vip') {
		tier = tierRaw;
	} else if (tierRaw.includes('vip')) {
		tier = 'vip';
	} else if (tierRaw.includes('bronze') || tierRaw.includes('founding')) {
		tier = 'bronze';
	}
	if (!tier) {
		errors.push(`Row ${li + 1}: invalid tier "${tierRaw}" for ${email}`);
		continue;
	}
	const nameField = iName >= 0 ? f[iName] : '';
	const first = iFirst >= 0 ? f[iFirst] : '';
	const last = iLast >= 0 ? f[iLast] : '';
	const name = nameField || [first, last].filter(Boolean).join(' ').trim() || email;

	rows.push({
		email,
		name,
		tier: tier as 'bronze' | 'vip',
		wc_order_id: iOrder >= 0 ? (f[iOrder] ?? '') : '',
		ordered_at: iOrderedAt >= 0 ? (f[iOrderedAt] ?? '') : ''
	});
	seen.add(email);
}

if (errors.length > 0) {
	console.warn(`\n⚠  Skipped ${errors.length} rows:`);
	for (const e of errors.slice(0, 20)) console.warn(`  ${e}`);
	if (errors.length > 20) console.warn(`  …and ${errors.length - 20} more`);
}

const now = Date.now();
const out: string[] = [];
out.push('-- ──────────────────────────────────────────────────────────────────');
out.push(`-- WC bulk-import — generated ${new Date(now).toISOString()}`);
out.push(`-- Rows: ${rows.length}    Source: ${args.in}`);
out.push('-- Idempotent: ON CONFLICT(email) DO UPDATE; safe to re-run.');
out.push('-- ──────────────────────────────────────────────────────────────────');
out.push('');

let written = 0;
while (written < rows.length) {
	const batch = rows.slice(written, written + batchSize);
	out.push(
		`-- batch ${Math.floor(written / batchSize) + 1} · rows ${written + 1}–${written + batch.length}`
	);
	out.push('BEGIN TRANSACTION;');
	for (const r of batch) {
		const id = randomUUID();
		const sourceRef = r.wc_order_id ? `wc:${r.wc_order_id.replace(/^wc:/, '')}` : null;
		out.push(
			`INSERT INTO member_imports (id, email, name, tier, access_status, role, source_ref, invited_at, last_emailed_at, claimed_member_id, claimed_at, created_at, updated_at) VALUES (${[
				sqlEscape(id),
				sqlEscape(r.email),
				sqlEscape(r.name),
				sqlEscape(r.tier),
				sqlEscape('active'),
				sqlEscape('member'),
				sqlEscape(sourceRef),
				'NULL',
				'NULL',
				'NULL',
				'NULL',
				String(now),
				String(now)
			].join(
				', '
			)}) ON CONFLICT(email) DO UPDATE SET name = excluded.name, tier = excluded.tier, access_status = excluded.access_status, role = excluded.role, source_ref = COALESCE(excluded.source_ref, member_imports.source_ref), updated_at = excluded.updated_at;`
		);
	}
	out.push('COMMIT;');
	out.push('');
	written += batch.length;
}

const absOut = resolve(process.cwd(), args.out!);
writeFileSync(absOut, out.join('\n'), 'utf8');

console.log('\n──────────────────────────────');
console.log(`Wrote ${rows.length} UPSERTs to ${absOut}`);
console.log(`Batches: ${Math.ceil(rows.length / batchSize)} × ${batchSize} rows/batch`);
console.log('');
console.log('Next steps:');
console.log(`  1. Review the SQL:        head -40 ${args.out}`);
console.log(
	`  2. Apply to remote D1:    wrangler d1 execute shivworks-network-db --remote --file=${args.out}`
);
console.log(`  3. Verify count:          pnpm tsx scripts/wc-reconcile.ts --csv ${args.in}`);
