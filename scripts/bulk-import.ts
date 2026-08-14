#!/usr/bin/env node
// scripts/bulk-import.ts
// Bulk-provision founding members from a CSV export.
//
// Usage:
//   pnpm bulk-import --file ./buyers.csv [--dry-run]
//
// CSV columns (header row required):
//   email        — required
//   tier         — required  (bronze | vip | "Jujitsu Course Member" | "VIP Founding Member" etc.)
//   wc_order_id  — optional  (becomes sourceRef = "wc:<id>")
//   name         — optional  (falls back to first_name + last_name or email)
//   first_name   — optional
//   last_name    — optional
//
// Runs in batches of 50. Logs a result line per row.
// In --dry-run mode no DB writes are performed.
//
// w259 — bulk-import dress rehearsal for ~643 existing buyers.

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { D1Compat } from '../src/lib/server/d1-compat.js';
import { upsertImportedMemberProvision } from '../src/lib/server/db/shivworks.js';
import { normalizeImportedTier } from '../src/lib/server/member-imports.js';

// ─── CLI args ────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
	options: {
		file: { type: 'string', short: 'f' },
		'dry-run': { type: 'boolean', default: false }
	},
	strict: true
});

const csvPath = args.file;
const isDryRun = args['dry-run'] ?? false;

if (!csvPath) {
	console.error('Usage: pnpm bulk-import --file <path/to/buyers.csv> [--dry-run]');
	process.exit(1);
}

// ─── CSV parsing (mirrors member-imports.ts normalisation) ───────────────────

function normalizeHeader(h: string): string {
	return h
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function readField(record: Record<string, string>, ...keys: string[]): string {
	for (const k of keys) {
		if (record[k]) return record[k];
	}
	return '';
}

interface CsvRow {
	email: string;
	name: string;
	tier: string;
	sourceRef: string | null;
}

function parseCsv(raw: string): { rows: CsvRow[]; errors: string[] } {
	const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
	if (lines.length < 2) {
		return { rows: [], errors: ['CSV must have a header row and at least one data row.'] };
	}

	const headers = lines[0].split(',').map(normalizeHeader);
	const errors: string[] = [];
	const rows: CsvRow[] = [];
	const seen = new Set<string>();

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Basic CSV field split (handles quoted fields with commas)
		const fields: string[] = [];
		let cur = '';
		let inQ = false;
		for (const ch of line + ',') {
			if (ch === '"') {
				inQ = !inQ;
				continue;
			}
			if (ch === ',' && !inQ) {
				fields.push(cur.trim());
				cur = '';
				continue;
			}
			cur += ch;
		}

		const record: Record<string, string> = {};
		for (let j = 0; j < headers.length; j++) {
			record[headers[j]] = fields[j] ?? '';
		}

		const email = readField(record, 'email', 'email_address', 'buyer_email').toLowerCase().trim();
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.push(`Row ${i + 1}: invalid email "${email}"`);
			continue;
		}
		if (seen.has(email)) {
			errors.push(`Row ${i + 1}: duplicate email ${email} (skipped)`);
			continue;
		}
		seen.add(email);

		const tierRaw = readField(
			record,
			'tier',
			'membership_tier',
			'product',
			'product_name',
			'order_item_name'
		);

		const fullName = readField(record, 'name', 'full_name', 'customer_name');
		const firstName = readField(record, 'first_name', 'firstname');
		const lastName = readField(record, 'last_name', 'lastname');
		const name = fullName || [firstName, lastName].filter(Boolean).join(' ').trim() || email;

		const orderId = readField(record, 'wc_order_id', 'order_id', 'order_number', 'id');
		const sourceRef = orderId ? `wc:${orderId}` : null;

		rows.push({ email, name, tier: tierRaw, sourceRef });
	}

	return { rows, errors };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;

async function main() {
	const absPath = resolve(process.cwd(), csvPath!);
	let raw: string;
	try {
		raw = readFileSync(absPath, 'utf8');
	} catch (err) {
		console.error(`Cannot read file: ${absPath}`);
		console.error(err instanceof Error ? err.message : String(err));
		process.exit(1);
	}

	const { rows, errors: parseErrors } = parseCsv(raw);

	if (parseErrors.length > 0) {
		console.warn('\n⚠  Parse warnings:');
		for (const e of parseErrors) console.warn(`   ${e}`);
	}

	console.log(`\nLoaded ${rows.length} valid rows from ${absPath}`);
	if (isDryRun) {
		console.log('DRY RUN — no database writes will be performed.\n');
	}

	// Validate tiers before touching the DB
	const validationErrors: string[] = [];
	for (const row of rows) {
		const tier = normalizeImportedTier(row.tier);
		if (!tier || tier === 'free') {
			validationErrors.push(`  ${row.email}: cannot map tier from "${row.tier}"`);
		}
	}
	if (validationErrors.length > 0) {
		console.error('\n✖  Tier validation failed for the following rows:');
		for (const e of validationErrors) console.error(e);
		console.error('\nFix the CSV and re-run. No writes performed.');
		process.exit(1);
	}

	if (isDryRun) {
		console.log('Dry-run validation passed. Rows that would be written:');
		for (const row of rows) {
			const tier = normalizeImportedTier(row.tier)!;
			console.log(`  ✓ ${row.email}  tier=${tier}  ref=${row.sourceRef ?? 'none'}`);
		}
		console.log(`\n✓ Dry run complete — ${rows.length} rows validated, 0 written.`);
		return;
	}

	const db = new D1Compat();

	let succeeded = 0;
	let failed = 0;

	for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
		const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);
		const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
		const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
		console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} rows)…`);

		for (const row of batch) {
			const tier = normalizeImportedTier(row.tier)!;
			try {
				await upsertImportedMemberProvision(db, {
					email: row.email,
					name: row.name,
					tier,
					accessStatus: 'active',
					role: 'member',
					sourceRef: row.sourceRef
				});
				console.log(`  ✓ ${row.email}  tier=${tier}`);
				succeeded++;
			} catch (err) {
				console.error(
					`  ✖ ${row.email}  tier=${tier}  error=${err instanceof Error ? err.message : String(err)}`
				);
				failed++;
			}
		}
	}

	console.log('\n──────────────────────────────');
	console.log(
		`Import complete: ${succeeded} succeeded, ${failed} failed out of ${rows.length} rows.`
	);

	if (failed > 0) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Fatal error:', err instanceof Error ? err.message : String(err));
	process.exit(1);
});
