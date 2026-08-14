import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAdminAnalyticsV1 } from '$lib/server/admin-analytics';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';
import { requireAdmin } from '$lib/server/guards';
import { nudgeAwaitingSignupImports } from '$lib/server/import-onboarding-nudge';

export const load: PageServerLoad = async ({ locals, platform }) => {
	requireAdmin(locals);
	const db = getDBFromPlatform(platform);
	const analytics = await getAdminAnalyticsV1(db);

	return { analytics };
};

export const actions: Actions = {
	nudgeAwaitingSignups: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const data = await request.formData();
		if (String(data.get('confirmBulkNudge') || '') !== 'confirm') {
			return fail(400, {
				error: 'Review the awaiting-signup recipients and confirm before sending re-nudges.'
			});
		}

		const db = getDBFromPlatform(platform);
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const result = await nudgeAwaitingSignupImports(db, runtimeEnv);
		if (result.failed > 0 && result.sent === 0) {
			return fail(500, {
				error: `Re-nudge failed for ${result.failed} purchaser${result.failed === 1 ? '' : 's'}. ${result.failures.slice(0, 2).join(' ')}`
			});
		}

		return {
			success: `Sent ${result.sent} onboarding re-nudge${result.sent === 1 ? '' : 's'}. Skipped ${result.skippedCooldown} on cooldown${result.failed > 0 ? `, ${result.failed} failed` : ''}.`
		};
	}
};
