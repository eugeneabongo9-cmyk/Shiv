import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_JSON_BODY_BYTES } from '$lib/server/body-limits';
import { buildRateLimitKey, RATE_LIMIT_POLICIES } from '$lib/constants/rate-limit-policies';
import { canAccessAudience } from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getEventById, upsertEventRsvp } from '$lib/server/db/shivworks';
import { RsvpBodySchema } from '$lib/server/schemas';
import { checkRateLimit } from '$lib/server/rate-limit';
import { readJsonBody, RequestBodyError } from '$lib/server/request-body';

export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
	if (!locals.user || locals.user.accessStatus !== 'active') {
		return json({ success: false, error: 'Member access required' }, { status: 403 });
	}

	const db = getDBFromPlatform(platform);
	const policy = RATE_LIMIT_POLICIES.rsvp;
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

	let raw: unknown;
	try {
		raw = await readJsonBody(request, MAX_JSON_BODY_BYTES);
	} catch (error) {
		if (error instanceof RequestBodyError) {
			return json({ success: false, error: error.message }, { status: error.status });
		}
		throw error;
	}

	const parsed = RsvpBodySchema.safeParse(raw);
	if (!parsed.success) {
		return json(
			{ success: false, error: 'Invalid request body', details: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const event = await getEventById(db, params.id);
	if (!event) {
		return json({ success: false, error: 'Event not found' }, { status: 404 });
	}

	if (!canAccessAudience(locals.user, event.accessTier)) {
		return json(
			{ success: false, error: 'That event requires a higher access level' },
			{ status: 403 }
		);
	}

	await upsertEventRsvp(db, locals.user.clerkUserId, event.id, parsed.data.status);
	return json({ success: true });
};
