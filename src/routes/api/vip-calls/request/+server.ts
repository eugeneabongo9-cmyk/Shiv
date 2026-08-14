import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_JSON_BODY_BYTES } from '$lib/server/body-limits';
import { buildRateLimitKey, RATE_LIMIT_POLICIES } from '$lib/constants/rate-limit-policies';
import { createVipCallRequest } from '$lib/server/db/shivworks';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { VipCallRequestSchema } from '$lib/server/schemas';
import { checkRateLimit } from '$lib/server/rate-limit';
import { readJsonBody, RequestBodyError } from '$lib/server/request-body';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user || locals.user.accessStatus !== 'active') {
		return json({ success: false, error: 'Member access required' }, { status: 403 });
	}

	if (locals.user.tier !== 'vip' && locals.user.role !== 'admin') {
		return json({ success: false, error: 'VIP access required' }, { status: 403 });
	}

	const db = getDBFromPlatform(platform);
	const policy = RATE_LIMIT_POLICIES.vipCall;
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

	const parsed = VipCallRequestSchema.safeParse(raw);
	if (!parsed.success) {
		return json(
			{ success: false, error: 'Invalid request body', details: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const { goals, preferredMonth, notes } = parsed.data;

	const created = await createVipCallRequest(
		db,
		locals.user.clerkUserId,
		goals,
		preferredMonth ?? null,
		notes ?? null
	);

	if (!created) {
		return json(
			{
				success: false,
				error: 'You already have an open VIP request. Update that request after the team responds.'
			},
			{ status: 409 }
		);
	}

	return json({ success: true });
};
