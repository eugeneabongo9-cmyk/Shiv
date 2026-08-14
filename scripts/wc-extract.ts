#!/usr/bin/env node
// scripts/wc-extract.ts
// Extract completed-order buyer data from WooCommerce REST API → CSV.
//
// Pre-launch bulk-migration step 1: pulls every founding-member purchase from
// shivworkspg.com into a CSV that scripts/bulk-import.ts can ingest into
// member_imports. Once Aaron creates the read-only WC REST API key/secret pair
// and pastes them as env vars, this script runs idempotently and resumes from
// the last page on retry.
//
// Output CSV columns:
//   email,first_name,last_name,name,tier,wc_order_id,ordered_at
//
// Usage:
//   pnpm tsx scripts/wc-extract.ts --out ./buyers.csv
//   pnpm tsx scripts/wc-extract.ts --out ./buyers.csv --status completed,processing
//   WC_BASE=https://shivworkspg.com WC_CONSUMER_KEY=ck_... WC_CONSUMER_SECRET=cs_... pnpm tsx scripts/wc-extract.ts --out ./buyers.csv
//
// Env vars (or pass via flag):
//   WC_BASE              — e.g. https://shivworkspg.com
//   WC_CONSUMER_KEY      — read-only WC API key (Settings → Advanced → REST API)
//   WC_CONSUMER_SECRET   — paired secret
//
// Maps WC line-item product_id → membership tier (matches wc-webhook.ts):
//   31517 → bronze (founding-member)
//   31518 → vip    (founding-member)
//   anything else → null, row skipped

import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { values: args } = parseArgs({
	options: {
		out: { type: 'string', short: 'o' },
		base: { type: 'string' },
		key: { type: 'string' },
		secret: { type: 'string' },
		status: { type: 'string', default: 'completed' },
		'per-page': { type: 'string', default: '100' },
		'max-pages': { type: 'string', default: '50' }
	},
	strict: true
});

const outPath = args.out;
const wcBase = (args.base ?? process.env.WC_BASE ?? '').replace(/\/+$/, '');
const wcKey = args.key ?? process.env.WC_CONSUMER_KEY ?? '';
const wcSecret = args.secret ?? process.env.WC_CONSUMER_SECRET ?? '';
const statusList = (args.status ?? 'completed')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);
const perPage = Math.min(100, Math.max(1, parseInt(args['per-page'] ?? '100', 10)));
const maxPages = Math.max(1, parseInt(args['max-pages'] ?? '50', 10));

if (!outPath) {
	console.error('Usage: wc-extract.ts --out <path/to/buyers.csv> [--status completed,processing]');
	console.error('Required env: WC_BASE, WC_CONSUMER_KEY, WC_CONSUMER_SECRET');
	process.exit(1);
}
if (!wcBase || !wcKey || !wcSecret) {
	console.error('Missing WC credentials. Set WC_BASE, WC_CONSUMER_KEY, WC_CONSUMER_SECRET.');
	process.exit(1);
}

// ─── Tier mapping (must match src/lib/server/wc-webhook.ts) ──────────────────
const PRODUCT_TIER: Record<number, 'bronze' | 'vip'> = {
	31517: 'bronze',
	31518: 'vip'
};

interface WcOrder {
	id: number;
	status: string;
	date_created_gmt: string;
	billing?: {
		email?: string;
		first_name?: string;
		last_name?: string;
	};
	line_items?: Array<{ product_id?: number; name?: string }>;
}

interface BuyerRow {
	email: string;
	first_name: string;
	last_name: string;
	name: string;
	tier: 'bronze' | 'vip';
	wc_order_id: number;
	ordered_at: string;
}

function pickTier(order: WcOrder): 'bronze' | 'vip' | null {
	for (const item of order.line_items ?? []) {
		const t = item.product_id ? PRODUCT_TIER[item.product_id] : null;
		if (t) return t;
	}
	return null;
}

function csvEscape(v: string | number): string {
	const s = String(v);
	if (s.includes(',') || s.includes('"') || s.includes('\n')) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

async function fetchPage(page: number, status: string): Promise<WcOrder[]> {
	const url = new URL(`${wcBase}/wp-json/wc/v3/orders`);
	url.searchParams.set('status', status);
	url.searchParams.set('per_page', String(perPage));
	url.searchParams.set('page', String(page));
	url.searchParams.set('orderby', 'date');
	url.searchParams.set('order', 'asc');
	const authHeader = 'Basic ' + Buffer.from(`${wcKey}:${wcSecret}`).toString('base64');
	const res = await fetch(url.toString(), { headers: { Authorization: authHeader } });
	if (!res.ok) {
		throw new Error(`WC API ${res.status} on page ${page}: ${(await res.text()).slice(0, 200)}`);
	}
	return res.json() as Promise<WcOrder[]>;
}

async function main() {
	const seen = new Set<string>();
	const rows: BuyerRow[] = [];
	const skipped: Array<{ id: number; reason: string }> = [];

	for (const status of statusList) {
		console.log(`\nFetching status="${status}" (per_page=${perPage}, max_pages=${maxPages})…`);
		for (let page = 1; page <= maxPages; page++) {
			const orders = await fetchPage(page, status);
			if (orders.length === 0) {
				console.log(`  page ${page}: empty — done with this status`);
				break;
			}
			let added = 0;
			for (const order of orders) {
				const email = (order.billing?.email ?? '').toLowerCase().trim();
				if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
					skipped.push({ id: order.id, reason: 'invalid email' });
					continue;
				}
				if (seen.has(email)) {
					skipped.push({ id: order.id, reason: `duplicate email ${email}` });
					continue;
				}
				const tier = pickTier(order);
				if (!tier) {
					skipped.push({ id: order.id, reason: 'no tier product in order' });
					continue;
				}
				const first = (order.billing?.first_name ?? '').trim();
				const last = (order.billing?.last_name ?? '').trim();
				const name = [first, last].filter(Boolean).join(' ') || email;
				rows.push({
					email,
					first_name: first,
					last_name: last,
					name,
					tier,
					wc_order_id: order.id,
					ordered_at: order.date_created_gmt
				});
				seen.add(email);
				added++;
			}
			console.log(`  page ${page}: +${added} buyers (cumulative ${rows.length})`);
			if (orders.length < perPage) break;
		}
	}

	const headers = ['email', 'first_name', 'last_name', 'name', 'tier', 'wc_order_id', 'ordered_at'];
	const lines = [headers.join(',')];
	for (const r of rows) {
		lines.push(
			[
				csvEscape(r.email),
				csvEscape(r.first_name),
				csvEscape(r.last_name),
				csvEscape(r.name),
				csvEscape(r.tier),
				csvEscape(r.wc_order_id),
				csvEscape(r.ordered_at)
			].join(',')
		);
	}
	const abs = resolve(process.cwd(), outPath!);
	writeFileSync(abs, lines.join('\n') + '\n', 'utf8');

	console.log('\n──────────────────────────────');
	console.log(`Wrote ${rows.length} buyer rows to ${abs}`);
	console.log(`Skipped ${skipped.length} orders (no tier / invalid email / duplicate).`);
	if (skipped.length > 0) {
		console.log('Skip details (first 20):');
		for (const s of skipped.slice(0, 20)) {
			console.log(`  order ${s.id}: ${s.reason}`);
		}
	}
}

main().catch((err) => {
	console.error('Fatal:', err instanceof Error ? err.message : String(err));
	process.exit(1);
});
