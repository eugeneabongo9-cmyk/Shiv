/**
 * Week 2 local smoke checks (API + D1 fixtures).
 *
 * Usage:
 *   node scripts/smoke-week2-local.mjs
 *
 * Requires: pnpm dev running, WC_WEBHOOK_SECRET, CRON_SECRET in env/.env.local
 */
import { createHmac, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DB_NAME = 'shivworks-network-db';
const BRONZE_PRODUCT_ID = 31517;
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173';
const wranglerBin = join(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function loadEnvLocal() {
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

function sqlEscape(value) {
	return String(value).replace(/'/g, "''");
}

function d1(sql) {
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
	const parsed = JSON.parse(out);
	const merged = [];
	for (const block of parsed) {
		if (Array.isArray(block.results)) merged.push(...block.results);
	}
	return merged;
}

function signBody(body, secret) {
	return createHmac('sha256', secret).update(body).digest('base64');
}

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function check(name, fn) {
	try {
		await fn();
		console.log(`PASS  ${name}`);
		return true;
	} catch (error) {
		console.error(`FAIL  ${name}`);
		console.error(`      ${error instanceof Error ? error.message : String(error)}`);
		return false;
	}
}

async function fetchWithRetry(url, init = {}, attempts = 3) {
	let lastError;
	for (let i = 0; i < attempts; i += 1) {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 30_000);
			try {
				return await fetch(url, { ...init, signal: controller.signal });
			} finally {
				clearTimeout(timeout);
			}
		} catch (error) {
			lastError = error;
			await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
		}
	}
	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

loadEnvLocal();
if (!process.env.CRON_SECRET) process.env.CRON_SECRET = 'local-dev-cron-secret-test-only';

const results = [];

results.push(
	await check('app responds', async () => {
		const res = await fetchWithRetry(`${BASE}/login`, { redirect: 'manual' });
		assert(res.status === 200 || res.status === 302, `unexpected status ${res.status}`);
	})
);

results.push(
	await check('retry endpoint rejects missing secret', async () => {
		const res = await fetchWithRetry(`${BASE}/api/internal/wc-webhook-retries`, { method: 'POST' });
		const body = await res.json();
		assert(res.status === 401, `expected 401, got ${res.status}`);
		assert(body.success === false, 'expected success=false');
	})
);

results.push(
	await check('retry endpoint rejects wrong secret', async () => {
		const res = await fetchWithRetry(`${BASE}/api/internal/wc-webhook-retries`, {
			method: 'POST',
			headers: { authorization: 'Bearer wrong-secret' }
		});
		assert(res.status === 401, `expected 401, got ${res.status}`);
	})
);

results.push(
	await check('retry endpoint accepts CRON_SECRET and returns shape', async () => {
		const res = await fetchWithRetry(`${BASE}/api/internal/wc-webhook-retries`, {
			method: 'POST',
			headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
		});
		const body = await res.json();
		if (res.status === 500 && String(body.error || '').includes('not configured')) {
			throw new Error(
				'CRON_SECRET not visible to the running server — restart pnpm dev with CRON_SECRET set'
			);
		}
		assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
		assert(typeof body.processed === 'number', 'processed missing');
		assert(Array.isArray(body.results), 'results missing');
	})
);

const awaitingEmail = `awaiting.signup.${Date.now()}@example.com`;
results.push(
	await check('seed awaiting-signup import row', async () => {
		const id = randomUUID();
		const now = Date.now();
		d1(`INSERT INTO member_imports (
			id, email, name, tier, access_status, role, source_ref,
			invited_at, last_emailed_at, claimed_member_id, claimed_at, created_at, updated_at
		) VALUES (
			'${sqlEscape(id)}',
			'${sqlEscape(awaitingEmail)}',
			'Awaiting Buyer',
			'bronze',
			'active',
			'member',
			'wc:smoke-awaiting',
			${now},
			NULL,
			NULL,
			NULL,
			${now},
			${now}
		)`);
		const rows = d1(
			`SELECT email, claimed_at, access_status FROM member_imports WHERE email = '${sqlEscape(awaitingEmail)}'`
		);
		assert(rows.length === 1, 'import row not inserted');
		assert(rows[0].claimed_at == null, 'expected unclaimed');
	})
);

results.push(
	await check('seed failed webhook event due for retry and recover it', async () => {
		const orderId = Number(String(Date.now()).slice(-9));
		const email = `retry.buyer.${orderId}@example.com`;
		const payload = {
			id: orderId,
			status: 'completed',
			billing: { first_name: 'Retry', last_name: 'Buyer', email },
			line_items: [
				{
					product_id: BRONZE_PRODUCT_ID,
					name: 'ShivWorks Network — Founding Bronze',
					quantity: 1
				}
			]
		};
		const payloadSnapshot = JSON.stringify(payload).replace(/'/g, "''");
		const eventId = randomUUID();
		const now = Date.now();
		d1(`INSERT INTO webhook_events (
			id, source, event_key, payload_hash, order_id, email, tier, payload_snapshot,
			status, attempt_count, max_attempts, next_retry_at, last_error, failed_step,
			received_at, started_at, completed_at, updated_at
		) VALUES (
			'${sqlEscape(eventId)}',
			'woocommerce',
			'wc:order:${orderId}:completed',
			'${sqlEscape(randomUUID())}',
			'${orderId}',
			'${sqlEscape(email)}',
			'bronze',
			'${payloadSnapshot}',
			'failed',
			1,
			5,
			${now - 1000},
			'smoke forced failure',
			'provision',
			${now - 5000},
			NULL,
			NULL,
			${now}
		)`);

		// Wrangler and the Vite/Miniflare D1 handle can contend on the local SQLite file.
		await new Promise((resolve) => setTimeout(resolve, 750));

		const before = d1(`SELECT status FROM webhook_events WHERE id = '${sqlEscape(eventId)}'`);
		assert(before[0]?.status === 'failed', 'fixture not failed');

		const res = await fetchWithRetry(`${BASE}/api/internal/wc-webhook-retries`, {
			method: 'POST',
			headers: {
				'x-cron-secret': process.env.CRON_SECRET,
				'content-type': 'application/json'
			}
		});
		const body = await res.json();
		assert(res.status === 200, `retry call failed: ${res.status} ${JSON.stringify(body)}`);
		assert(body.processed >= 1, `expected processed>=1, got ${JSON.stringify(body)}`);

		await new Promise((resolve) => setTimeout(resolve, 250));

		const after = d1(
			`SELECT status, last_error FROM webhook_events WHERE id = '${sqlEscape(eventId)}'`
		);
		assert(after[0]?.status === 'completed', `expected completed, got ${JSON.stringify(after[0])}`);

		const imports = d1(
			`SELECT email, tier, access_status FROM member_imports WHERE lower(email) = '${sqlEscape(email)}'`
		);
		assert(imports.length === 1, 'retry did not provision import');
		assert(imports[0].tier === 'bronze', 'unexpected tier');
	})
);

results.push(
	await check('launch gating: /live and /community are not gated prefixes', async () => {
		await new Promise((resolve) => setTimeout(resolve, 750));
		// Unauthenticated hits should redirect to login, not Coming Soon.
		for (const path of ['/live', '/community']) {
			const res = await fetchWithRetry(`${BASE}${path}`, { redirect: 'manual' });
			assert(
				res.status === 302 || res.status === 303,
				`${path} expected redirect, got ${res.status}`
			);
			const location = res.headers.get('location') || '';
			assert(
				location.includes('/login'),
				`${path} should send signed-out users to login, got ${location}`
			);
			assert(
				!location.includes('/coming-soon') && !location.includes('comingSoon'),
				`${path} should not be launch-gated`
			);
		}
	})
);

results.push(
	await check('signed-out /library still redirects to login', async () => {
		const res = await fetchWithRetry(`${BASE}/library`, { redirect: 'manual' });
		assert(res.status === 302 || res.status === 303, `got ${res.status}`);
		assert((res.headers.get('location') || '').includes('/login'), 'expected login redirect');
	})
);

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log('');
console.log(
	`Week 2 smoke: ${passed}/${results.length} passed${failed ? `, ${failed} failed` : ''}`
);
console.log(`Seeded awaiting-signup email (for admin UI re-nudge): ${awaitingEmail}`);
if (failed) process.exit(1);
