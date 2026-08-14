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

describe('login page load', () => {
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
				url: new URL('https://network.shivworks.com/login?redirect=/community'),
				platform: {}
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Fcommunity'
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
				url: new URL('https://network.shivworks.com/login?redirect=/community'),
				platform: {}
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Fcommunity'
		});
	});

	it('redirects clerk subpaths back to the canonical login route', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: null, sessionId: null, isAuthenticated: false },
					user: null
				},
				url: new URL('https://network.shivworks.com/login/factor-one'),
				platform: {}
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/login'
		});
	});

	it('returns prefillEmail for anonymous members who already have an account', async () => {
		resolveAuthRouteForEmailMock.mockResolvedValue({ kind: 'signin' });

		await expect(
			load({
				locals: {
					auth: { userId: null, sessionId: null, isAuthenticated: false },
					user: null
				},
				url: new URL(
					'https://network.shivworks.com/login?email=member%40example.com&redirect=/library'
				),
				platform: {}
			} as never)
		).resolves.toMatchObject({
			redirectTo: '/library',
			prefillEmail: 'member@example.com'
		});
	});

	it('surfaces a revoked-session notice after forced sign-out', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: null, sessionId: null, isAuthenticated: false },
					user: null
				},
				url: new URL('https://network.shivworks.com/login?session=revoked&redirect=/library'),
				platform: {}
			} as never)
		).resolves.toMatchObject({
			redirectTo: '/library',
			sessionRevoked: true
		});
	});
});
