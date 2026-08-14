// POST /api/auth/provision-check
// Tells the login page whether an email should create a password (imported
// purchaser) or use normal Clerk sign-in.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_PROVISION_CHECK_BODY_BYTES } from '$lib/server/body-limits';
import { buildRateLimitKey, RATE_LIMIT_POLICIES } from '$lib/constants/rate-limit-policies';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { normalizeProvisionEmail, resolveAuthRouteForEmail } from '$lib/server/member-provision';
import { checkRateLimit } from '$lib/server/rate-limit';
import { readJsonBody, RequestBodyError } from '$lib/server/request-body';
import { ProvisionCheckSchema } from '$lib/server/schemas';

function clientRateLimitKey(request: Request): string {
	const ip =
		request.headers.get('cf-connecting-ip') ||
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		'unknown';
	return buildRateLimitKey(RATE_LIMIT_POLICIES.provisionCheck.keyPrefix, ip);
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = getDBFromPlatform(platform);
	const policy = RATE_LIMIT_POLICIES.provisionCheck;
	const rateLimit = await checkRateLimit({
		db,
		key: clientRateLimitKey(request),
		limit: policy.limit,
		windowSeconds: policy.windowSeconds
	});
	if (!rateLimit.allowed) {
		return json(
			{ error: 'Too many requests. Please try again later.' },
			{
				status: 429,
				headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }
			}
		);
	}

	let body: unknown;
	try {
		body = await readJsonBody(request, MAX_PROVISION_CHECK_BODY_BYTES);
	} catch (error) {
		if (error instanceof RequestBodyError) {
			return json({ error: error.message }, { status: error.status });
		}
		throw error;
	}

	const parsed = ProvisionCheckSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'A valid email address is required.' }, { status: 400 });
	}

	const normalized = normalizeProvisionEmail(parsed.data.email);
	if (!normalized) {
		return json({ error: 'A valid email address is required.' }, { status: 400 });
	}

	const route = await resolveAuthRouteForEmail(db, normalized);

	if (route.kind === 'signup') {
		// Do not reveal purchaser name/tier to unauthenticated callers.
		return json({
			route: 'signup',
			email: normalized
		});
	}

	return json({
		route: 'signin',
		email: normalized
	});
};
