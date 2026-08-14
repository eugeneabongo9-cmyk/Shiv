import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveAuthRouteForEmail } from '$lib/server/member-provision';
import { isPaidMemberTier } from '$lib/constants/tiers';
import { sanitizeInternalRedirect } from '$lib/utils/redirects';

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	const emailParam = (url.searchParams.get('email') || '').trim().toLowerCase();
	const explicitRedirect = url.searchParams.get('redirect');
	let redirectTo = sanitizeInternalRedirect(explicitRedirect, '/welcome');

	if (url.pathname !== '/signup' && url.pathname.startsWith('/signup/')) {
		redirect(302, `/signup${url.search}`);
	}

	let provisioned = false;
	let provisionedEmail: string | null = null;
	let provisionedTier: 'bronze' | 'vip' | null = null;
	let provisionedName: string | null = null;

	if (emailParam) {
		const db = getDBFromPlatform(platform);
		const route = await resolveAuthRouteForEmail(db, emailParam);
		if (route.kind === 'signup') {
			provisioned = true;
			provisionedEmail = emailParam;
			provisionedTier = route.tier;
			provisionedName = route.name;
			if (!explicitRedirect) {
				redirectTo = `/welcome?email=${encodeURIComponent(emailParam)}`;
			}
		}
	}

	if (
		locals.user?.accessStatus === 'active' &&
		(locals.user.role === 'admin' || isPaidMemberTier(locals.user.tier))
	) {
		redirect(302, redirectTo);
	}

	if (locals.auth.isAuthenticated && locals.user) {
		redirect(302, `/checkout?redirect=${encodeURIComponent(redirectTo)}`);
	}

	return {
		redirectTo,
		provisioned,
		provisionedEmail,
		provisionedTier,
		provisionedName
	};
};
