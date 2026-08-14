/**
 * Replay a signed WooCommerce order webhook against local or deployed Network app.
 *
 * Usage:
 *   pnpm tsx scripts/test-wc-webhook.ts fejza.denis@gmail.com bronze
 *   pnpm tsx scripts/test-wc-webhook.ts fejza.denis@gmail.com vip
 *   pnpm tsx scripts/test-wc-webhook.ts fejza.denis@gmail.com cancelled
 *   pnpm tsx scripts/test-wc-webhook.ts fejza.denis@gmail.com refunded
 *
 * Env (from .env.local or shell):
 *   WC_WEBHOOK_SECRET — required
 *   WC_WEBHOOK_URL    — default http://localhost:5173/api/wc/webhook
 */
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DB_NAME = 'shivworks-network-db';
const wranglerBin = join(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const BRONZE_PRODUCT_ID = 31517;
const VIP_PRODUCT_ID = 31518;

type TierArg = 'bronze' | 'vip' | 'cancelled' | 'refunded' | 'processing' | 'gear';

function loadEnvLocal(): void {
	for (const file of ['.env.local', '.env']) {
		const path = join(process.cwd(), file);
		if (!existsSync(path)) continue;
		for (const line of readFileSync(path, 'utf8').split('\n')) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const eq = trimmed.indexOf('=');
			if (eq === -1) continue;
			const key = trimmed.slice(0, eq).trim();
			let value = trimmed.slice(eq + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			if (!process.env[key]) process.env[key] = value;
		}
	}
}

function signBody(body: string, secret: string): string {
	return createHmac('sha256', secret).update(body).digest('base64');
}

function sqlEscape(value: string): string {
	return value.replace(/'/g, "''");
}

function d1Query(sql: string): unknown[] {
	const out = execFileSync(
		process.execPath,
		[wranglerBin, 'd1', 'execute', DB_NAME, '--command', sql, '--json', '--local'],
		{
			encoding: 'utf8',
			env: {
				...process.env,
				CLOUDFLARE_ACCOUNT_ID:
					process.env.CLOUDFLARE_ACCOUNT_ID ?? 'ce810d489150aad89d66eabff9a0288e'
			},
			stdio: ['ignore', 'pipe', 'pipe']
		}
	);

	const parsed = JSON.parse(out) as Array<{ results?: unknown[] }>;
	const merged: unknown[] = [];
	for (const block of parsed) {
		if (Array.isArray(block.results)) merged.push(...block.results);
	}
	return merged;
}

function productForTier(tier: TierArg): { productId: number; name: string; status: string } {
	switch (tier) {
		case 'vip':
			return {
				productId: VIP_PRODUCT_ID,
				name: 'ShivWorks Network — Founding VIP',
				status: 'completed'
			};
		case 'cancelled':
			return {
				productId: BRONZE_PRODUCT_ID,
				name: 'ShivWorks Network — Founding Bronze',
				status: 'cancelled'
			};
		case 'refunded':
			return {
				productId: BRONZE_PRODUCT_ID,
				name: 'ShivWorks Network — Founding Bronze',
				status: 'refunded'
			};
		case 'processing':
			return {
				productId: BRONZE_PRODUCT_ID,
				name: 'ShivWorks Network — Founding Bronze',
				status: 'processing'
			};
		case 'gear':
			return { productId: 99999, name: 'Training Gi', status: 'completed' };
		case 'bronze':
		default:
			return {
				productId: BRONZE_PRODUCT_ID,
				name: 'ShivWorks Network — Founding Bronze',
				status: 'completed'
			};
	}
}

async function main(): Promise<void> {
	loadEnvLocal();

	const email = (process.argv[2] ?? '').toLowerCase().trim();
	const tierArg = (process.argv[3] ?? 'bronze').toLowerCase() as TierArg;
	const secret = process.env.WC_WEBHOOK_SECRET;
	const url = process.env.WC_WEBHOOK_URL ?? 'http://localhost:5173/api/wc/webhook';

	if (!email) {
		console.error(
			'Usage: pnpm tsx scripts/test-wc-webhook.ts <email> [bronze|vip|cancelled|refunded|processing|gear]'
		);
		process.exit(1);
	}
	if (!secret) {
		console.error('WC_WEBHOOK_SECRET is not set (.env.local or shell).');
		process.exit(1);
	}

	const { productId, name, status } = productForTier(tierArg);
	const orderId = Number(String(Date.now()).slice(-9));
	const body = JSON.stringify({
		id: orderId,
		status,
		billing: {
			first_name: 'Test',
			last_name: 'Buyer',
			email
		},
		line_items: [{ product_id: productId, name, quantity: 1 }]
	});
	const signature = signBody(body, secret);

	console.log(`POST ${url}`);
	console.log(`Order ${orderId} · status=${status} · product_id=${productId} · email=${email}`);
	console.log('');

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-wc-webhook-signature': signature,
			'x-wc-webhook-topic': 'order.updated'
		},
		body
	});

	const text = await response.text();
	let parsed: unknown = text;
	try {
		parsed = JSON.parse(text);
	} catch {
		// keep raw text
	}

	console.log(`Response ${response.status}`);
	console.log(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2));
	console.log('');

	const rows = d1Query(
		`SELECT email, tier, access_status, role, source_ref, claimed_at, updated_at
		 FROM member_imports WHERE lower(email) = '${sqlEscape(email)}';
		 SELECT email, tier, access_status FROM members WHERE lower(email) = '${sqlEscape(email)}';`
	);

	console.log('Local D1 snapshot:');
	console.log(JSON.stringify(rows, null, 2));
	console.log('');
	console.log('Next: refresh /dashboard or /library in the browser (claim runs on next request).');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
