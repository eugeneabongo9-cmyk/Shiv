// POST /api/internal/wc-webhook-retries
// Secret-protected runner for due WooCommerce webhook retries.
// Schedule via Worker cron, GitHub Action, or any HTTP cron hitting this endpoint.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';
import { logError } from '$lib/server/log';
import { processDueWebhookRetries } from '$lib/server/wc-webhook-pipeline';

function readBearerToken(request: Request): string | null {
	const header = request.headers.get('authorization');
	if (!header) return null;
	const [scheme, token] = header.split(/\s+/, 2);
	if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
	return token.trim();
}

function readCronSecret(request: Request): string | null {
	return (
		request.headers.get('x-cron-secret')?.trim() ||
		readBearerToken(request) ||
		new URL(request.url).searchParams.get('secret')?.trim() ||
		null
	);
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	const expected = runtimeEnv.CRON_SECRET?.trim() || runtimeEnv.WC_WEBHOOK_RETRY_SECRET?.trim();
	if (!expected) {
		logError('wc.webhook.retry.config', new Error('CRON_SECRET is not configured'));
		return json({ success: false, error: 'retry runner not configured' }, { status: 500 });
	}

	const provided = readCronSecret(request);
	if (!provided || provided !== expected) {
		return json({ success: false, error: 'unauthorized' }, { status: 401 });
	}

	const db = getDBFromPlatform(platform);
	const kv = (
		platform as { env?: { KV?: import('@cloudflare/workers-types').KVNamespace } } | undefined
	)?.env?.KV;

	const results = await processDueWebhookRetries(db, runtimeEnv, kv);
	const completed = results.filter((result) => result.status === 'completed').length;
	const failed = results.filter(
		(result) => result.status === 'failed' || result.status === 'dead_letter'
	).length;

	return json({
		success: true,
		processed: results.length,
		completed,
		failed,
		results: results.map((result) => ({
			eventId: result.eventId,
			orderId: result.orderId,
			status: result.status,
			action: result.action ?? null,
			error: result.error ?? null
		}))
	});
};
