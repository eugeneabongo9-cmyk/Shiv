import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_JSON_BODY_BYTES } from '$lib/server/body-limits';
import { buildRateLimitKey, RATE_LIMIT_POLICIES } from '$lib/constants/rate-limit-policies';
import { canAccessAudience } from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getCourseModuleEpisodeById, upsertMemberEpisodeProgress } from '$lib/server/db/shivworks';
import { EpisodeProgressSchema } from '$lib/server/schemas';
import { checkRateLimit } from '$lib/server/rate-limit';
import { readJsonBody, RequestBodyError } from '$lib/server/request-body';

export const POST: RequestHandler = async ({ request, locals, params, platform }) => {
	if (!locals.auth.isAuthenticated || !locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const db = getDBFromPlatform(platform);
	const policy = RATE_LIMIT_POLICIES.episodeProgress;
	const rateLimit = await checkRateLimit({
		db,
		key: buildRateLimitKey(policy.keyPrefix, locals.user.clerkUserId),
		limit: policy.limit,
		windowSeconds: policy.windowSeconds
	});
	if (!rateLimit.allowed) {
		return json(
			{ success: false, error: 'Too many requests. Please try again later.' },
			{
				status: 429,
				headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }
			}
		);
	}

	const episode = await getCourseModuleEpisodeById(db, params.episodeId);
	if (!episode) {
		return json({ success: false, error: 'Episode not found' }, { status: 404 });
	}
	if (
		!canAccessAudience(locals.user, episode.courseAccessTier) ||
		!canAccessAudience(locals.user, episode.accessTier)
	) {
		return json({ success: false, error: 'Upgrade required for this episode' }, { status: 403 });
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

	const parsed = EpisodeProgressSchema.safeParse(raw);
	if (!parsed.success) {
		return json(
			{ success: false, error: 'Invalid request body', details: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const { currentSeconds: rawSeconds, durationSeconds: rawDuration, completed } = parsed.data;
	const currentSeconds = Math.round(rawSeconds);
	const durationSeconds =
		rawDuration === null || rawDuration === undefined
			? null
			: Number.isFinite(rawDuration)
				? Math.round(rawDuration)
				: null;

	await upsertMemberEpisodeProgress(db, {
		memberId: locals.user.clerkUserId,
		episodeId: episode.id,
		currentSeconds,
		durationSeconds,
		completed
	});

	return json({ success: true });
};
