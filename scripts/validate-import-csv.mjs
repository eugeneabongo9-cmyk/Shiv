import { readFileSync } from 'node:fs';
import { parseImportedMemberCsv } from '../src/lib/server/member-imports.ts';

const csvPath = process.argv[2];
if (!csvPath) {
	console.error('Usage: node --import tsx scripts/validate-import-csv.mjs <path-to.csv>');
	process.exit(1);
}

const text = readFileSync(csvPath, 'utf8');
const result = parseImportedMemberCsv(text);
const tiers = {};
const statuses = {};

for (const line of text.trim().split(/\r?\n/).slice(1)) {
	const match = line.match(/,(Processing|Completed),/);
	const status = match?.[1] ?? 'unknown';
	statuses[status] = (statuses[status] ?? 0) + 1;
}

for (const row of result.rows) {
	tiers[row.tier] = (tiers[row.tier] ?? 0) + 1;
}

console.log('Parsed rows:', result.rows.length);
console.log('Parse errors:', result.errors.length);
console.log('Tiers:', tiers);
console.log('WC order status:', statuses);
if (result.errors.length > 0) {
	console.log('\nFirst errors:');
	for (const error of result.errors.slice(0, 10)) {
		console.log(`  ${error}`);
	}
}
