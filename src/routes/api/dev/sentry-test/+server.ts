// GET /api/dev/sentry-test?fire=1
//
// Deliberate-error endpoint for validating Sentry event delivery once the
// DSN is provisioned. Curl it, watch the Sentry dashboard, expect the issue
// to appear within ~30 seconds.
//
// Guarded against production: returns 404 in production environments.
//
// Delete this route after Sentry validation completes — it has no place
// in a long-lived prod surface. Tracked under WHAT #469.

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveRuntimeEnv } from '$lib/server/env';

function isProductionRuntime(runtimeEnv: Record<string, string | undefined>): boolean {
	return runtimeEnv.ENVIRONMENT === 'production' || runtimeEnv.NODE_ENV === 'production';
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	if (isProductionRuntime(runtimeEnv)) {
		error(404, 'Not found');
	}

	const fire = url.searchParams.get('fire') === '1';

	if (!fire) {
		return json({
			ok: true,
			message:
				'Sentry test endpoint is reachable. Add ?fire=1 to trigger a deliberate error that should appear in the Sentry dashboard within ~30 seconds.',
			env: runtimeEnv.ENVIRONMENT ?? runtimeEnv.NODE_ENV ?? 'unknown',
			dsnConfigured: Boolean(runtimeEnv.SENTRY_DSN)
		});
	}

	throw new Error(
		`Deliberate Sentry validation error fired from /api/dev/sentry-test at ${new Date().toISOString()}`
	);
};
