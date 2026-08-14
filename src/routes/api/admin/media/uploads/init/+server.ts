import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_JSON_BODY_BYTES } from '$lib/server/body-limits';
import { normalizeContentAudience } from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	attachStreamUidToMediaAsset,
	createEpisodeUploadReservation,
	getCourseModuleById,
	markMediaUploadFailed,
	replaceEpisodeUploadReservation
} from '$lib/server/db/shivworks';
import { resolveRuntimeEnv } from '$lib/server/env';
import {
	createTusDirectUpload,
	getMaxDirectUploadBytes,
	getStreamConfigStatus,
	isSupportedVideoFile
} from '$lib/server/stream';
import { AdminUploadInitSchema } from '$lib/server/schemas';
import { readJsonBody, RequestBodyError } from '$lib/server/request-body';

const MAX_FILE_SIZE_BYTES = getMaxDirectUploadBytes();

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

	const parsed = AdminUploadInitSchema.safeParse(raw);
	if (!parsed.success) {
		return json(
			{ success: false, error: 'Invalid request body', details: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const payload = parsed.data;

	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	const configStatus = getStreamConfigStatus(runtimeEnv);
	if (!configStatus.ready) {
		return json(
			{
				success: false,
				error: `Cloudflare Stream is not configured. Missing: ${configStatus.missingKeys.join(', ')}.`
			},
			{ status: 503 }
		);
	}

	if (payload.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
		return json(
			{
				success: false,
				error: `File too large. Maximum supported size is ${MAX_FILE_SIZE_BYTES} bytes (30GB).`,
				maxFileSizeBytes: MAX_FILE_SIZE_BYTES
			},
			{ status: 400 }
		);
	}

	if (!isSupportedVideoFile({ fileName: payload.fileName, fileType: payload.fileType })) {
		return json(
			{
				success: false,
				error:
					'That file does not look like a supported video. Choose an MP4, MOV, MKV, or WebM file.'
			},
			{ status: 400 }
		);
	}

	const db = getDBFromPlatform(platform);

	const title = payload.title;
	const moduleId = payload.moduleId;
	const episodeNumber = payload.episodeNumber ?? null;
	const maxDurationSeconds = payload.maxDurationSeconds ?? null;

	const destinationModule = await getCourseModuleById(db, moduleId);
	if (!destinationModule) {
		return json(
			{
				success: false,
				error: 'Upload destination not found. Pick a course module and try again.'
			},
			{ status: 404 }
		);
	}

	let reservation;
	try {
		const reservationInput = {
			moduleId,
			title,
			description: payload.description?.trim() || null,
			accessTier: payload.accessTier ? normalizeContentAudience(payload.accessTier) : null,
			fileName: payload.fileName?.trim() || `${title}.mp4`,
			sourceBytes: payload.fileSizeBytes,
			durationSeconds: maxDurationSeconds,
			playbackPolicy: payload.playbackPolicy ?? 'private',
			createdByMemberId: locals.user!.clerkUserId
		};
		reservation = payload.episodeId
			? await replaceEpisodeUploadReservation(db, {
					...reservationInput,
					episodeId: payload.episodeId
				})
			: await createEpisodeUploadReservation(db, {
					...reservationInput,
					episodeNumber
				});
	} catch (error) {
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Could not reserve an episode slot for this upload.'
			},
			{ status: 400 }
		);
	}

	try {
		const directUpload = await createTusDirectUpload(runtimeEnv, {
			uploadLength: payload.fileSizeBytes,
			fileName: payload.fileName?.trim() || `${title}.mp4`,
			creatorId: locals.user!.clerkUserId,
			maxDurationSeconds: maxDurationSeconds ?? undefined,
			playbackPolicy: payload.playbackPolicy ?? 'private',
			meta: {
				mediaAssetId: reservation.mediaAsset.id,
				episodeId: reservation.episode.id,
				moduleId,
				courseId: reservation.episode.courseId
			}
		});

		await attachStreamUidToMediaAsset(db, reservation.mediaAsset.id, directUpload.streamUid);

		return json({
			success: true,
			data: {
				mediaAssetId: reservation.mediaAsset.id,
				episodeId: reservation.episode.id,
				streamUid: directUpload.streamUid,
				uploadUrl: directUpload.uploadUrl,
				tusResumable: '1.0.0',
				maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
				ingestStatus: 'pending_upload',
				expiresAt: directUpload.expiresAt
			}
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'Failed to initialize upload';
		await markMediaUploadFailed(db, reservation.mediaAsset.id, reason);
		return json({ success: false, error: reason }, { status: 500 });
	}
};
