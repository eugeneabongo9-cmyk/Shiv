import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	buildProvisionedSignupPath,
	normalizeProvisionEmail,
	resolveAuthRouteForEmail
} from '$lib/server/member-provision';
import { isPaidMemberTier } from '$lib/constants/tiers';
import { sanitizeInternalRedirect } from '$lib/utils/redirects';

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	const redirectTo = sanitizeInternalRedirect(url.searchParams.get('redirect'), '/dashboard');

	if (url.pathname !== '/login' && url.pathname.startsWith('/login/')) {
		redirect(302, `/login${url.search}`);
	}

	if (
		locals.user?.accessStatus === 'active' &&
		(locals.user.role === 'admin' || isPaidMemberTier(locals.user.tier))
	) {
		redirect(302, redirectTo);
	}

	if (locals.auth.isAuthenticated && locals.user) {
		if (locals.user.accessStatus === 'revoked') {
			redirect(302, `/welcome?access=revoked&returnTo=${encodeURIComponent(redirectTo)}`);
		}
		redirect(302, `/checkout?redirect=${encodeURIComponent(redirectTo)}`);
	}

	const email = normalizeProvisionEmail(url.searchParams.get('email') || '');
	if (email && !locals.auth.isAuthenticated) {
		const db = getDBFromPlatform(platform);
		const route = await resolveAuthRouteForEmail(db, email);
		if (route.kind === 'signup') {
			redirect(302, buildProvisionedSignupPath(email, url.searchParams.get('redirect')));
		}
	}

	return {
		redirectTo,
		prefillEmail: email,
		sessionRevoked: url.searchParams.get('session') === 'revoked'
	};
};
