import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_JSON_BODY_BYTES } from '$lib/server/body-limits';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { applyStreamMediaWebhookUpdate, getMediaAssetById } from '$lib/server/db/shivworks';
import { resolveRuntimeEnv } from '$lib/server/env';
import { getStreamVideoDetails, type StreamVideoDetails } from '$lib/server/stream';
import { AdminUploadSyncSchema } from '$lib/server/schemas';
import { readJsonBody, RequestBodyError } from '$lib/server/request-body';

function isAdmin(locals: App.Locals): boolean {
	return Boolean(locals.auth.isAuthenticated && locals.user?.role === 'admin');
}

function normalizeStreamState(video: StreamVideoDetails): 'processing' | 'ready' | 'failed' {
	const state = video.status?.state?.toLowerCase();
	if (video.readyToStream || state === 'ready') {
		return 'ready';
	}
	if (state === 'error' || state === 'failed') {
		return 'failed';
	}
	return 'processing';
}

function normalizePositiveNumber(value: unknown): number | null {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.auth.isAuthenticated) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}
	if (!isAdmin(locals)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	let raw: unknown;
	try {
		raw = await readJsonBody(request, MAX_JSON_BODY_BYTES);
	} catch (error) {
		if (error instanceof RequestBodyError) {
			return json({ success: false, error: error.message }, { status: error.status });
		}
		throw error;
	}

	const parsed = AdminUploadSyncSchema.safeParse(raw);
	if (!parsed.success) {
		return json(
			{ success: false, error: 'Invalid request body', details: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const { mediaAssetId } = parsed.data;

	const db = getDBFromPlatform(platform);
	const existing = await getMediaAssetById(db, mediaAssetId);
	if (!existing) {
		return json({ success: false, error: 'Media asset not found' }, { status: 404 });
	}
	if (existing.provider !== 'cloudflare_stream' || !existing.providerAssetId) {
		return json(
			{ success: false, error: 'Media asset is missing a Cloudflare Stream UID' },
			{ status: 409 }
		);
	}

	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	let streamVideo: StreamVideoDetails;
	try {
		streamVideo = await getStreamVideoDetails(runtimeEnv, existing.providerAssetId);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Could not read Stream video status'
			},
			{ status: 502 }
		);
	}

	const state = normalizeStreamState(streamVideo);
	const failureReason =
		streamVideo.status?.errorReasonText || streamVideo.status?.errorReasonCode || null;
	const updatedMedia = await applyStreamMediaWebhookUpdate(db, {
		streamUid: existing.providerAssetId,
		state,
		durationSeconds: normalizePositiveNumber(streamVideo.duration),
		sourceBytes: normalizePositiveNumber(streamVideo.size),
		failureReason,
		thumbnailUrl: streamVideo.thumbnail ?? null
	});

	if (!updatedMedia) {
		return json(
			{ success: false, error: 'Stream asset was not linked to a media record' },
			{ status: 409 }
		);
	}

	return json({
		success: true,
		data: {
			mediaAssetId: updatedMedia.id,
			streamUid: existing.providerAssetId,
			ingestStatus: updatedMedia.ingestStatus,
			streamState: streamVideo.status?.state ?? null,
			readyToStream: Boolean(streamVideo.readyToStream),
			durationSeconds: updatedMedia.durationSeconds,
			sourceBytes: updatedMedia.sourceBytes,
			failureReason: updatedMedia.failureReason
		}
	});
};
