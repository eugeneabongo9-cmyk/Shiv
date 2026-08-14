// POST /api/wc/webhook
// WooCommerce → Network purchase webhook with durable event pipeline.
//
// Pipeline: Validation → Durable event record → provision|revoke → ActiveCampaign
// Idempotent on wc:order:{id} (provision) and wc:order:{id}:revoke (revocation).

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { sha256Hex } from '$lib/server/db/webhook-events';
import { resolveRuntimeEnv } from '$lib/server/env';
import { requireWcWebhookSecret } from '$lib/server/env-validation';
import { logError } from '$lib/server/log';
import { readTextBody, RequestBodyError } from '$lib/server/request-body';
import { MAX_WC_WEBHOOK_BODY_BYTES } from '$lib/server/body-limits';
import {
	verifyWcSignature,
	readWcWebhookSignatureHeader,
	parseWcOrder,
	tierFromOrder
} from '$lib/server/wc-webhook';
import {
	ingestWcRevokeWebhookEvent,
	ingestWcWebhookEvent,
	processWcRevokeWebhookEvent,
	processWcWebhookEvent,
	revokeReasonFromOrderStatus
} from '$lib/server/wc-webhook-pipeline';

const ORDER_COMPLETION_STATUSES = new Set(['completed', 'processing']);
const ORDER_REVOCATION_STATUSES = new Set(['refunded', 'cancelled']);

export const POST: RequestHandler = async ({ request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	const secretResult = requireWcWebhookSecret(runtimeEnv);
	if (!secretResult.ok) {
		logError('wc.webhook.config', new Error('WC_WEBHOOK_SECRET failed validation'), {
			issues: secretResult.issues
		});
		return json({ success: false, error: 'webhook not configured' }, { status: 500 });
	}
	const secret = secretResult.value;

	let rawBody: string;
	try {
		rawBody = await readTextBody(request, MAX_WC_WEBHOOK_BODY_BYTES);
	} catch (error) {
		if (error instanceof RequestBodyError) {
			return json({ success: false, error: error.message }, { status: error.status });
		}
		throw error;
	}

	const signature = readWcWebhookSignatureHeader(request.headers);
	const valid = await verifyWcSignature(rawBody, signature, secret);
	if (!valid) {
		logError('wc.webhook.verify', new Error('invalid signature'), {
			hasSignatureHeader: signature != null
		});
		return json({ success: false, error: 'invalid signature' }, { status: 401 });
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(rawBody);
	} catch {
		logError('wc.webhook.parse', new Error('invalid JSON'));
		return json({ success: false, error: 'invalid body' }, { status: 400 });
	}

	const order = parseWcOrder(parsed);
	if (!order) {
		logError('wc.webhook.shape', new Error('order shape did not match'), {
			rawSize: rawBody.length
		});
		return json({ success: false, error: 'invalid order shape' }, { status: 400 });
	}

	const tier = tierFromOrder(order);
	if (!tier) {
		return json({ success: true, ignored: true, reason: 'no-membership-product' });
	}

	const db = getDBFromPlatform(platform);
	const payloadHash = await sha256Hex(rawBody);
	const kv = (
		platform as { env?: { KV?: import('@cloudflare/workers-types').KVNamespace } } | undefined
	)?.env?.KV;

	const revokeReason = revokeReasonFromOrderStatus(order.status);
	if (revokeReason && ORDER_REVOCATION_STATUSES.has(order.status)) {
		const { event } = await ingestWcRevokeWebhookEvent(db, {
			order,
			tier,
			payloadHash,
			payloadSnapshot: rawBody
		});
		const result = await processWcRevokeWebhookEvent(db, event.id, order, tier, revokeReason, kv);

		if (result.replayed) {
			return json({
				success: true,
				replayed: true,
				action: 'revoke',
				orderId: order.id,
				eventId: event.id,
				status: result.status
			});
		}

		if (result.status === 'dead_letter') {
			return json(
				{
					success: false,
					error: 'processing exhausted retries',
					action: 'revoke',
					orderId: order.id,
					eventId: event.id,
					status: result.status
				},
				{ status: 500 }
			);
		}

		if (result.status === 'failed') {
			return json(
				{
					success: false,
					error: result.error ?? 'processing failed',
					action: 'revoke',
					orderId: order.id,
					eventId: event.id,
					status: result.status
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			action: 'revoke',
			orderId: order.id,
			eventId: event.id,
			tier,
			email: result.email,
			status: result.status
		});
	}

	if (!ORDER_COMPLETION_STATUSES.has(order.status)) {
		// Partial refunds typically leave status=completed; they do not revoke.
		// pending / failed / on-hold remain ignored until a terminal status arrives.
		return json({ success: true, ignored: true, reason: `status=${order.status}` });
	}

	const { event } = await ingestWcWebhookEvent(db, {
		order,
		tier,
		payloadHash,
		payloadSnapshot: rawBody
	});
	const result = await processWcWebhookEvent(db, runtimeEnv, event.id, order, tier);

	if (result.replayed) {
		return json({
			success: true,
			replayed: true,
			action: 'provision',
			orderId: order.id,
			eventId: event.id,
			status: result.status
		});
	}

	if (result.status === 'dead_letter') {
		return json(
			{
				success: false,
				error: 'processing exhausted retries',
				action: 'provision',
				orderId: order.id,
				eventId: event.id,
				status: result.status
			},
			{ status: 500 }
		);
	}

	if (result.status === 'failed') {
		return json(
			{
				success: false,
				error: result.error ?? 'processing failed',
				action: 'provision',
				orderId: order.id,
				eventId: event.id,
				status: result.status
			},
			{ status: 500 }
		);
	}

	return json({
		success: true,
		action: 'provision',
		orderId: order.id,
		eventId: event.id,
		tier,
		email: result.email,
		status: result.status
	});
};
