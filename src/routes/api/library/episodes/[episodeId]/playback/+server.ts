import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canAccessAudience } from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getCourseModuleEpisodeById } from '$lib/server/db/shivworks';
import { resolveRuntimeEnv } from '$lib/server/env';
import {
	buildPublicHlsUrl,
	buildSignedHlsUrl,
	buildStreamEmbedUrl,
	createStreamPlaybackToken,
	extractStreamPlaybackId,
	getPlaybackTokenTtlSeconds
} from '$lib/server/stream';

export const GET: RequestHandler = async ({ locals, params, platform }) => {
	if (!locals.auth.isAuthenticated || !locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const db = getDBFromPlatform(platform);
	const episode = await getCourseModuleEpisodeById(db, params.episodeId);
	if (!episode) {
		return json({ success: false, error: 'Episode not found' }, { status: 404 });
	}
	const isAdmin = locals.user.role === 'admin';
	// Admins may preview a ready episode before it is published so the
	// release path can be verified end to end ahead of going live.
	if (episode.status !== 'available' && !isAdmin) {
		return json({ success: false, error: 'Episode is not available yet' }, { status: 409 });
	}
	if (
		!canAccessAudience(locals.user, episode.courseAccessTier) ||
		!canAccessAudience(locals.user, episode.accessTier)
	) {
		return json({ success: false, error: 'Upgrade required for this episode' }, { status: 403 });
	}
	if (!episode.media) {
		return json({ success: false, error: 'Episode has no media asset yet' }, { status: 409 });
	}
	if (episode.media.ingestStatus !== 'ready') {
		return json(
			{
				success: false,
				error: 'Episode media is still processing',
				ingestStatus: episode.media.ingestStatus
			},
			{ status: 409 }
		);
	}

	if (episode.media.provider === 'external') {
		const sourceUrl = episode.media.sourceUrl ?? '';
		const playbackType = sourceUrl.startsWith('http') ? 'external' : 'mp4';
		return json({
			success: true,
			data: {
				episodeId: episode.id,
				provider: episode.media.provider,
				playbackType,
				url: sourceUrl,
				durationSeconds: episode.media.durationSeconds
			}
		});
	}

	if (!episode.media.providerAssetId) {
		return json(
			{ success: false, error: 'Stream media is missing provider asset id' },
			{ status: 409 }
		);
	}

	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	if (episode.media.playbackPolicy === 'public') {
		const playbackId = episode.media.providerAssetId;
		return json({
			success: true,
			data: {
				episodeId: episode.id,
				provider: episode.media.provider,
				playbackType: 'hls',
				url: buildPublicHlsUrl(playbackId),
				embedUrl: buildStreamEmbedUrl(playbackId),
				durationSeconds: episode.media.durationSeconds
			}
		});
	}

	const ttlSeconds = Math.min(
		86_400,
		Math.max(getPlaybackTokenTtlSeconds(runtimeEnv), (episode.media.durationSeconds ?? 0) + 600)
	);
	const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
	const token = await createStreamPlaybackToken(
		runtimeEnv,
		episode.media.providerAssetId,
		expiresAt
	);
	const signedUrl = buildSignedHlsUrl(token.token);
	const playbackId = extractStreamPlaybackId(signedUrl) || token.token;

	return json({
		success: true,
		data: {
			episodeId: episode.id,
			provider: episode.media.provider,
			playbackType: 'hls',
			url: signedUrl,
			embedUrl: buildStreamEmbedUrl(playbackId),
			expiresAt: token.expiresAt,
			durationSeconds: episode.media.durationSeconds
		}
	});
};
