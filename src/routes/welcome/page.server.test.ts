import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

const {
	getUnclaimedImportForEmailMock,
	claimImportedMemberProvisionMock,
	getMemberByClerkIdMock,
	listCoursesMock,
	listEventsMock,
	bustMock
} = vi.hoisted(() => ({
	getUnclaimedImportForEmailMock: vi.fn(),
	claimImportedMemberProvisionMock: vi.fn(),
	getMemberByClerkIdMock: vi.fn(),
	listCoursesMock: vi.fn(),
	listEventsMock: vi.fn(),
	bustMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: () => ({})
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getUnclaimedImportForEmail: getUnclaimedImportForEmailMock,
	claimImportedMemberProvision: claimImportedMemberProvisionMock,
	getMemberByClerkId: getMemberByClerkIdMock,
	listCourses: listCoursesMock,
	listEvents: listEventsMock
}));

vi.mock('$lib/server/kv-cache', () => ({
	bust: bustMock
}));

vi.mock('$lib/server/welcome', () => ({
	buildWelcomeExperience: () => ({
		tierBadge: 'VIP',
		upcoming: [],
		countdown: { label: 'Soon' },
		cohortSummary: 'Cohort',
		tierHighlights: [],
		whatToExpect: []
	})
}));

function createUser(
	overrides: Partial<{
		clerkUserId: string;
		email: string;
		name: string;
		tier: 'free' | 'bronze' | 'vip' | null;
		role: 'member' | 'admin';
		accessStatus: 'none' | 'active' | 'revoked';
	}> = {}
) {
	return {
		clerkUserId: 'user_123',
		email: 'member@example.com',
		name: 'Member',
		tier: 'vip' as const,
		role: 'member' as const,
		accessStatus: 'active' as const,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

describe('welcome page load', () => {
	it('returns ready access state and a sanitized redirect target', async () => {
		getUnclaimedImportForEmailMock.mockResolvedValue(null);
		listCoursesMock.mockResolvedValue([]);
		listEventsMock.mockResolvedValue([]);

		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: createUser()
				},
				url: new URL('https://network.shivworks.com/welcome?returnTo=/vip-calls'),
				platform: undefined
			} as never)
		).resolves.toMatchObject({
			user: expect.objectContaining({ clerkUserId: 'user_123', tier: 'vip' }),
			ready: true,
			accessRevoked: false,
			redirectTo: '/vip-calls',
			experience: expect.objectContaining({
				tierBadge: 'VIP',
				upcoming: expect.any(Array),
				countdown: expect.objectContaining({ label: expect.any(String) })
			})
		});
	});

	it('returns pending access state while membership is still syncing', async () => {
		getUnclaimedImportForEmailMock.mockResolvedValue(null);

		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: createUser({ tier: 'free', accessStatus: 'none' })
				},
				url: new URL('https://network.shivworks.com/welcome?returnTo=https://evil.test'),
				platform: undefined
			} as never)
		).resolves.toMatchObject({
			user: expect.objectContaining({ clerkUserId: 'user_123', tier: 'free' }),
			ready: false,
			needsMembershipPurchase: true,
			redirectTo: '/dashboard'
		});
	});

	it('does not treat free active accounts as provisioned on welcome', async () => {
		getUnclaimedImportForEmailMock.mockResolvedValue(null);

		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: createUser({ tier: 'free', accessStatus: 'active' })
				},
				url: new URL('https://network.shivworks.com/welcome'),
				platform: undefined
			} as never)
		).resolves.toMatchObject({
			ready: false,
			needsMembershipPurchase: true
		});
	});

	it('marks revoked members and skips purchase CTAs', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: createUser({ tier: 'bronze', accessStatus: 'revoked' })
				},
				url: new URL('https://network.shivworks.com/welcome?access=revoked'),
				platform: undefined
			} as never)
		).resolves.toMatchObject({
			ready: false,
			accessRevoked: true,
			needsMembershipPurchase: false
		});
	});

	it('claims an unclaimed import for the signed-in buyer', async () => {
		let importCalls = 0;
		getUnclaimedImportForEmailMock.mockImplementation(async () => {
			importCalls += 1;
			if (importCalls === 1) {
				return {
					id: 'import_1',
					email: 'member@example.com',
					tier: 'bronze',
					accessStatus: 'active'
				};
			}
			return null;
		});
		claimImportedMemberProvisionMock.mockResolvedValue({ id: 'import_1' });
		getMemberByClerkIdMock.mockResolvedValue(
			createUser({ tier: 'bronze', accessStatus: 'active' })
		);
		listCoursesMock.mockResolvedValue([]);
		listEventsMock.mockResolvedValue([]);

		const result = await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: createUser({ tier: 'free', accessStatus: 'none' })
			},
			url: new URL('https://network.shivworks.com/welcome'),
			platform: { env: {} }
		} as never);

		expect(result).toMatchObject({
			ready: true,
			claimAttempted: true,
			pendingImport: false
		});
		expect(claimImportedMemberProvisionMock).toHaveBeenCalledTimes(1);
		expect(bustMock).toHaveBeenCalled();
	});
});
