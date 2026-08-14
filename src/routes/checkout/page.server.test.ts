import { beforeEach, describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

const { getUnclaimedImportForEmailMock } = vi.hoisted(() => ({
	getUnclaimedImportForEmailMock: vi.fn()
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getUnclaimedImportForEmail: getUnclaimedImportForEmailMock
}));

describe('checkout page load', () => {
	beforeEach(() => {
		getUnclaimedImportForEmailMock.mockResolvedValue(null);
	});

	it('returns a sanitized redirect target for free-access users', async () => {
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
				url: new URL('https://network.shivworks.com/checkout?redirect=/community')
			} as never)
		).resolves.toMatchObject({
			user: expect.objectContaining({ clerkUserId: 'user_123', tier: 'free' }),
			redirectTo: '/community',
			pricing: expect.objectContaining({
				bronzePrice: expect.any(String),
				vipPrice: expect.any(String)
			})
		});
	});

	it('requires VIP checkout for the VIP Lounge redirect', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: {
						clerkUserId: 'user_123',
						email: 'member@example.com',
						name: 'Member',
						tier: 'bronze',
						role: 'member',
						accessStatus: 'active',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				},
				url: new URL('https://network.shivworks.com/checkout?redirect=/vip-calls')
			} as never)
		).resolves.toMatchObject({
			redirectTo: '/vip-calls',
			requiredTier: 'vip'
		});
	});

	it('redirects paid members back to the preserved destination', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: {
						clerkUserId: 'user_123',
						email: 'member@example.com',
						name: 'Member',
						tier: 'bronze',
						role: 'member',
						accessStatus: 'active',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				},
				url: new URL('https://network.shivworks.com/checkout?redirect=/library')
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/library'
		});
	});

	it('routes purchasers with a pending import to welcome instead of checkout', async () => {
		getUnclaimedImportForEmailMock.mockResolvedValue({ id: 'import_123' });

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
				url: new URL('https://network.shivworks.com/checkout?redirect=/library')
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/welcome?returnTo=%2Flibrary'
		});
	});
});
