import { describe, expect, it, vi } from 'vitest';
import { load } from './[...rest]/+page.server';

const { getDBFromPlatformMock, resolveAuthRouteForEmailMock } = vi.hoisted(() => ({
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	resolveAuthRouteForEmailMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/member-provision', () => ({
	resolveAuthRouteForEmail: resolveAuthRouteForEmailMock,
	buildProvisionedSignupPath: (email: string, redirect?: string | null) => {
		const params = new URLSearchParams({ email, provisioned: '1' });
		if (redirect) params.set('redirect', redirect);
		return `/signup?${params.toString()}`;
	},
	normalizeProvisionEmail: (email: string) => email.trim().toLowerCase() || null
}));

describe('signup page load', () => {
	it('sends active free users to checkout instead of treating them as entitled', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: {
						clerkUserId: 'user_123',
						email: 'member@example.com',
						name: 'Member',
						tier: 'free',
						role: 'member',
						accessStatus: 'active',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				},
				url: new URL('https://network.shivworks.com/signup?redirect=/vip-calls'),
				platform: {}
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Fvip-calls'
		});
	});

	it('sends signed-in but non-entitled users to checkout with the preserved destination', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: {
						clerkUserId: 'user_123',
						email: 'member@example.com',
						name: 'Member',
						tier: null,
						role: 'member',
						accessStatus: 'none',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				},
				url: new URL('https://network.shivworks.com/signup?redirect=/community'),
				platform: {}
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Fcommunity'
		});
	});

	it('returns provisioned signup context when D1 has an unclaimed import', async () => {
		resolveAuthRouteForEmailMock.mockResolvedValue({
			kind: 'signup',
			tier: 'vip',
			name: 'Aaron Thomas'
		});

		await expect(
			load({
				locals: {
					auth: { userId: null, sessionId: null, isAuthenticated: false },
					user: null
				},
				url: new URL(
					'https://network.shivworks.com/signup?email=aaron%40outerfields.co&provisioned=1'
				),
				platform: {}
			} as never)
		).resolves.toMatchObject({
			redirectTo: '/welcome?email=aaron%40outerfields.co',
			provisioned: true,
			provisionedEmail: 'aaron@outerfields.co',
			provisionedTier: 'vip',
			provisionedName: 'Aaron Thomas'
		});
	});

	it('ignores forged provisioned query params when D1 has no import', async () => {
		resolveAuthRouteForEmailMock.mockResolvedValue({ kind: 'signin' });

		await expect(
			load({
				locals: {
					auth: { userId: null, sessionId: null, isAuthenticated: false },
					user: null
				},
				url: new URL(
					'https://network.shivworks.com/signup?email=stranger%40example.com&provisioned=1'
				),
				platform: {}
			} as never)
		).resolves.toMatchObject({
			provisioned: false,
			provisionedEmail: null
		});
	});

	it('redirects clerk subpaths back to the canonical signup route', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: null, sessionId: null, isAuthenticated: false },
					user: null
				},
				url: new URL('https://network.shivworks.com/signup/verify-email-address'),
				platform: {}
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/signup'
		});
	});
});
