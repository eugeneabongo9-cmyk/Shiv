import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_JSON_BODY_BYTES } from '$lib/server/body-limits';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	getMediaAssetById,
	markMediaUploadCompleted,
	updateUploadEpisodeMetadata
} from '$lib/server/db/shivworks';
import { AdminUploadCompleteSchema } from '$lib/server/schemas';
import { readJsonBody, RequestBodyError } from '$lib/server/request-body';

function isAdmin(locals: App.Locals): boolean {
	return Boolean(locals.auth.isAuthenticated && locals.user?.role === 'admin');
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

	const parsed = AdminUploadCompleteSchema.safeParse(raw);
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
	if (existing.ingestStatus === 'failed') {
		return json(
			{ success: false, error: existing.failureReason || 'Video upload failed' },
			{ status: 409 }
		);
	}

	if (parsed.data.episodeId && parsed.data.title && parsed.data.accessTier) {
		await updateUploadEpisodeMetadata(db, {
			episodeId: parsed.data.episodeId,
			title: parsed.data.title,
			description: parsed.data.description ?? null,
			accessTier: parsed.data.accessTier
		});
	}

	const mediaAsset =
		existing.ingestStatus === 'pending_upload'
			? await markMediaUploadCompleted(db, mediaAssetId)
			: existing;

	return json({
		success: true,
		data: {
			mediaAssetId,
			ingestStatus: mediaAsset?.ingestStatus ?? existing.ingestStatus,
			streamUid: existing.providerAssetId,
			updatedAt: mediaAsset?.updatedAt ?? existing.updatedAt
		}
	});
};
