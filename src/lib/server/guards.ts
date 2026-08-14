import { error, redirect } from '@sveltejs/kit';
import { isPaidMemberTier } from '$lib/constants/tiers';
import { isLaunchGated } from '$lib/server/launch-gating';
import { buildLoginHref } from '$lib/utils/redirects';

export function requireAuthenticated(
	locals: App.Locals,
	redirectTo = '/dashboard'
): NonNullable<App.Locals['user']> {
	if (!locals.auth.isAuthenticated || !locals.user) {
		redirect(302, buildLoginHref(redirectTo));
	}

	return locals.user;
}

export function requireEntitled(
	locals: App.Locals,
	redirectTo = '/dashboard'
): NonNullable<App.Locals['user']> {
	const user = requireAuthenticated(locals, redirectTo);
	if (isLaunchGated(redirectTo, user)) {
		return user;
	}
	if (user.accessStatus === 'revoked') {
		redirect(302, `/welcome?access=revoked&returnTo=${encodeURIComponent(redirectTo)}`);
	}
	if (user.accessStatus !== 'active') {
		redirect(302, `/checkout?redirect=${encodeURIComponent(redirectTo)}`);
	}

	return user;
}

export function requireVip(
	locals: App.Locals,
	redirectTo = '/vip-calls'
): NonNullable<App.Locals['user']> {
	const user = requirePaidMember(locals, redirectTo);
	if (isLaunchGated(redirectTo, user)) {
		return user;
	}
	if (user.tier !== 'vip' && user.role !== 'admin') {
		error(403, 'VIP access required');
	}
	return user;
}

export function requirePaidMember(
	locals: App.Locals,
	redirectTo = '/dashboard'
): NonNullable<App.Locals['user']> {
	const user = requireEntitled(locals, redirectTo);
	if (isLaunchGated(redirectTo, user)) {
		return user;
	}
	if (!isPaidMemberTier(user.tier) && user.role !== 'admin') {
		redirect(302, `/checkout?redirect=${encodeURIComponent(redirectTo)}`);
	}

	return user;
}

export function requireAdmin(locals: App.Locals): NonNullable<App.Locals['user']> {
	const user = requireAuthenticated(locals, '/admin');
	if (user.role !== 'admin') {
		error(403, 'Admin access required');
	}
	return user;
}
