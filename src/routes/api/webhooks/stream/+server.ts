import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_STREAM_WEBHOOK_BODY_BYTES } from '$lib/server/body-limits';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { applyStreamMediaWebhookUpdate } from '$lib/server/db/shivworks';
import { resolveRuntimeEnv } from '$lib/server/env';
import { logError } from '$lib/server/log';
import { type StreamWebhookPayload, verifyStreamWebhookSignature } from '$lib/server/stream';
import { readTextBody, RequestBodyError } from '$lib/server/request-body';
import { StreamWebhookPayloadSchema } from '$lib/server/schemas';
import { claimWebhookEvent } from '$lib/server/webhook-idempotency';

function normalizeState(payload: StreamWebhookPayload): 'processing' | 'ready' | 'failed' {
	const state = payload.status?.state?.toLowerCase();
	if (payload.readyToStream || state === 'ready') {
		return 'ready';
	}
	if (state === 'error' || state === 'failed') {
		return 'failed';
	}
	return 'processing';
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	const secret = runtimeEnv.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
	if (!secret) {
		logError('stream.webhook.config', new Error('CLOUDFLARE_STREAM_WEBHOOK_SECRET is not set'));
		return json({ success: false, error: 'Webhook secret is not configured' }, { status: 500 });
	}

	let rawBody: string;
	try {
		rawBody = await readTextBody(request, MAX_STREAM_WEBHOOK_BODY_BYTES);
	} catch (error) {
		if (error instanceof RequestBodyError) {
			return json({ success: false, error: error.message }, { status: error.status });
		}
		throw error;
	}

	const signatureHeader = request.headers.get('webhook-signature');
	const isValid = await verifyStreamWebhookSignature(signatureHeader, rawBody, secret);
	if (!isValid) {
		logError('stream.webhook.verify', new Error('invalid signature'));
		return json({ success: false, error: 'Invalid webhook signature' }, { status: 401 });
	}

	let rawPayload: unknown;
	try {
		rawPayload = JSON.parse(rawBody);
	} catch {
		return json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
	}

	const parsedPayload = StreamWebhookPayloadSchema.safeParse(rawPayload);
	if (!parsedPayload.success) {
		return json(
			{
				success: false,
				error: 'Invalid Stream webhook payload',
				details: parsedPayload.error.flatten()
			},
			{ status: 400 }
		);
	}
	const payload = parsedPayload.data;
	const state = normalizeState(payload);
	const eventId = `${payload.uid}:${state}`;

	const db = getDBFromPlatform(platform);
	const claim = await claimWebhookEvent(db, 'stream', eventId, `uid=${payload.uid}`);
	if (!claim.fresh) {
		return json({ success: true, replayed: true, streamUid: payload.uid, ingestStatus: state });
	}

	const updatedMedia = await applyStreamMediaWebhookUpdate(db, {
		streamUid: payload.uid,
		state,
		durationSeconds: payload.duration ? Math.round(payload.duration) : null,
		sourceBytes: payload.size ?? null,
		failureReason: payload.status?.errorReasonText || payload.status?.errorReasonCode || null,
		thumbnailUrl: payload.thumbnail ?? null
	});

	if (!updatedMedia) {
		return json({ success: true, ignored: true, reason: 'stream_uid not found' }, { status: 202 });
	}

	return json({
		success: true,
		data: {
			mediaAssetId: updatedMedia.id,
			streamUid: payload.uid,
			ingestStatus: updatedMedia.ingestStatus
		}
	});
};
