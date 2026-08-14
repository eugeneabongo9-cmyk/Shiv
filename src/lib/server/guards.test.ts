import { describe, expect, it } from 'vitest';
import {
	requireAdmin,
	requireAuthenticated,
	requireEntitled,
	requirePaidMember,
	requireVip
} from '$lib/server/guards';

function createUser(
	overrides: Partial<NonNullable<App.Locals['user']>> = {}
): NonNullable<App.Locals['user']> {
	return {
		clerkUserId: 'user_123',
		email: 'member@example.com',
		name: 'Member Example',
		tier: 'bronze',
		role: 'member',
		accessStatus: 'active',
		createdAt: new Date('2026-04-02T00:00:00.000Z').toISOString(),
		updatedAt: new Date('2026-04-02T00:00:00.000Z').toISOString(),
		...overrides
	};
}

function createLocals(overrides: Partial<App.Locals> = {}): App.Locals {
	return {
		auth: {
			userId: 'user_123',
			sessionId: 'sess_123',
			isAuthenticated: true
		},
		user: createUser(),
		...overrides
	};
}

function captureThrown(callback: () => unknown) {
	try {
		callback();
		throw new Error('Expected callback to throw');
	} catch (error) {
		return error;
	}
}

describe('route guards', () => {
	it('returns the authenticated user when access is valid', () => {
		const locals = createLocals();
		expect(requireAuthenticated(locals)).toEqual(locals.user);
		expect(requireEntitled(locals)).toEqual(locals.user);
	});

	it('redirects signed-out users to login with a preserved target', () => {
		const error = captureThrown(() =>
			requireAuthenticated(
				createLocals({
					auth: { userId: null, sessionId: null, isAuthenticated: false },
					user: null
				}),
				'/live'
			)
		) as { status: number; location: string };

		expect(error).toMatchObject({
			status: 302,
			location: '/login?redirect=%2Flive'
		});
	});

	it('redirects authenticated users without access to checkout on non-gated routes', () => {
		const error = captureThrown(() =>
			requireEntitled(
				createLocals({
					user: createUser({ accessStatus: 'none' })
				}),
				'/dashboard'
			)
		) as { status: number; location: string };

		expect(error).toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Fdashboard'
		});
	});

	it('lets free members through launch-gated routes without checkout redirects', () => {
		const user = requirePaidMember(
			createLocals({
				user: createUser({ tier: 'free', accessStatus: 'active' })
			}),
			'/messages'
		);

		expect(user.tier).toBe('free');
	});

	// /community is gated as of 2026-08-13, so the guard now returns the viewer
	// and the layout renders ComingSoon. /library is the equivalent ungated paid
	// surface, so the redirect behaviour is asserted there instead.
	it('redirects free members from an ungated paid surface to checkout', () => {
		const error = captureThrown(() =>
			requirePaidMember(
				createLocals({
					user: createUser({ tier: 'free', accessStatus: 'active' })
				}),
				'/library'
			)
		) as { status: number; location: string };

		expect(error).toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Flibrary'
		});
	});

	it('still redirects free members away from non-gated paid routes', () => {
		const error = captureThrown(() =>
			requirePaidMember(
				createLocals({
					user: createUser({ tier: 'free', accessStatus: 'active' })
				}),
				'/library'
			)
		) as { status: number; location: string };

		expect(error).toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Flibrary'
		});
	});

	it('redirects revoked members to welcome recovery instead of checkout', () => {
		const error = captureThrown(() =>
			requireEntitled(
				createLocals({
					user: createUser({ accessStatus: 'revoked', tier: 'bronze' })
				}),
				'/dashboard'
			)
		) as { status: number; location: string };

		expect(error).toMatchObject({
			status: 302,
			location: '/welcome?access=revoked&returnTo=%2Fdashboard'
		});
	});

	// A gated route short-circuits before the tier check. Nothing is exposed:
	// the layout renders ComingSoon in place of the page body either way.
	// /vip-calls joined this set on 2026-08-13 when it was re-gated.
	it('lets non-vip members through still-gated Coming Soon VIP placeholders', () => {
		for (const route of ['/messages', '/vip-calls']) {
			const user = requireVip(
				createLocals({
					user: createUser({ tier: 'bronze', accessStatus: 'active' })
				}),
				route
			);

			expect(user.tier).toBe('bronze');
		}
	});

	it('denies bronze members from non-gated VIP-only routes', () => {
		const error = captureThrown(() => requireVip(createLocals(), '/member-vip-lounge')) as {
			status: number;
		};
		expect(error).toMatchObject({ status: 403 });
	});

	it('allows admins through VIP and admin guards', () => {
		const locals = createLocals({
			user: createUser({ tier: 'bronze', role: 'admin' })
		});

		expect(requireVip(locals)).toEqual(locals.user);
		expect(requireAdmin(locals)).toEqual(locals.user);
	});
});
