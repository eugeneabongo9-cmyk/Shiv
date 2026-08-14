import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	getDBFromPlatformMock,
	getMemberProfileMock,
	listMemberEntitlementsMock,
	upsertMemberProfileMock,
	getLeaderboardOptInMock,
	setLeaderboardOptInMock,
	awardPointsMock,
	requireAuthenticatedMock
} = vi.hoisted(() => ({
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	getMemberProfileMock: vi.fn(),
	listMemberEntitlementsMock: vi.fn(async () => [] as Array<Record<string, unknown>>),
	upsertMemberProfileMock: vi.fn(),
	getLeaderboardOptInMock: vi.fn(async () => false),
	setLeaderboardOptInMock: vi.fn(async () => {}),
	awardPointsMock: vi.fn(),
	requireAuthenticatedMock: vi.fn(() => ({
		clerkUserId: 'user_123',
		email: 'member@example.com',
		name: 'Member',
		tier: 'bronze',
		role: 'member',
		accessStatus: 'active',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	}))
}));

vi.mock('$lib/server/d1-compat', () => ({ getDBFromPlatform: getDBFromPlatformMock }));
vi.mock('$lib/server/guards', () => ({ requireAuthenticated: requireAuthenticatedMock }));
vi.mock('$lib/server/db/shivworks', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/db/shivworks')>(
		'$lib/server/db/shivworks'
	);
	return {
		...actual,
		getMemberProfile: getMemberProfileMock,
		listMemberEntitlements: listMemberEntitlementsMock,
		upsertMemberProfile: upsertMemberProfileMock,
		getLeaderboardOptIn: getLeaderboardOptInMock,
		setLeaderboardOptIn: setLeaderboardOptInMock
	};
});
vi.mock('$lib/server/gamification', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/gamification')>(
		'$lib/server/gamification'
	);
	return { ...actual, awardPoints: awardPointsMock };
});

import { _isProfileComplete as isProfileComplete, actions, load } from './[...rest]/+page.server';
import type { MemberProfileRecord } from '$lib/server/db/shivworks';

function makeProfile(over: Partial<MemberProfileRecord> = {}): MemberProfileRecord {
	return {
		memberId: 'user_123',
		locationCity: null,
		locationState: null,
		background: {
			civilian: false,
			lawEnforcement: false,
			military: false,
			medical: false,
			other: false
		},
		ecqcAlumni: false,
		mucAlumni: false,
		ewoAlumni: false,
		otherCourses: null,
		carrySetup: null,
		trainingGoal: null,
		showInFinder: true,
		profileCompletedAt: null,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		...over
	};
}

function fd(values: Record<string, string>): FormData {
	const f = new FormData();
	for (const [k, v] of Object.entries(values)) f.set(k, v);
	return f;
}

const cookies = { set: vi.fn(), get: vi.fn() };

describe('isProfileComplete', () => {
	it('requires city, state, training goal, and a background', () => {
		expect(isProfileComplete(null)).toBe(false);
		expect(isProfileComplete(makeProfile({ locationCity: 'Austin' }))).toBe(false);
		expect(
			isProfileComplete(
				makeProfile({
					locationCity: 'Austin',
					locationState: 'TX',
					trainingGoal: 'Drill ECQC weekly.'
				})
			)
		).toBe(false);
		expect(
			isProfileComplete(
				makeProfile({
					locationCity: 'Austin',
					locationState: 'TX',
					trainingGoal: 'Drill ECQC weekly.',
					background: {
						civilian: true,
						lawEnforcement: false,
						military: false,
						medical: false,
						other: false
					}
				})
			)
		).toBe(true);
	});
});

describe('account load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		cookies.set.mockClear();
		cookies.get.mockReturnValue(undefined);
	});

	it('returns the profile and stamps the seen cookie', async () => {
		getMemberProfileMock.mockResolvedValue(null);
		const result = (await load({
			locals: {},
			platform: { env: {} },
			url: new URL('https://x/account'),
			cookies
		} as never)) as { profile: unknown; welcome: boolean; isComplete: boolean };
		expect(result.profile).toBeNull();
		expect(result.welcome).toBe(false);
		expect(result.isComplete).toBe(false);
		expect(cookies.set).toHaveBeenCalledWith(
			'sw_account_seen',
			'1',
			expect.objectContaining({ path: '/' })
		);
	});

	it('flags welcome when ?welcome=1', async () => {
		getMemberProfileMock.mockResolvedValue(null);
		const result = (await load({
			locals: {},
			platform: { env: {} },
			url: new URL('https://x/account?welcome=1'),
			cookies
		} as never)) as { welcome: boolean };
		expect(result.welcome).toBe(true);
	});

	it('loads the signed-in member access history', async () => {
		getMemberProfileMock.mockResolvedValue(null);
		listMemberEntitlementsMock.mockResolvedValue([
			{
				id: 'entitlement_1',
				tier: 'bronze',
				sourceType: 'import',
				status: 'active',
				createdAt: '2026-08-01T00:00:00.000Z',
				updatedAt: '2026-08-01T00:00:00.000Z'
			}
		]);

		const result = (await load({
			locals: {},
			platform: { env: {} },
			url: new URL('https://x/account'),
			cookies
		} as never)) as { accessHistory: Array<{ id: string }> };

		expect(listMemberEntitlementsMock).toHaveBeenCalledWith({ kind: 'db' }, 'user_123');
		expect(result.accessHistory).toEqual([expect.objectContaining({ id: 'entitlement_1' })]);
	});
});

describe('account save action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
	});

	it('rejects required-field omissions when submitting full', async () => {
		getMemberProfileMock.mockResolvedValue(null);
		const result = await actions.save({
			request: { formData: async () => fd({ submitFull: '1' }) },
			locals: {},
			platform: { env: {} }
		} as never);
		expect(result?.status).toBe(400);
		expect(upsertMemberProfileMock).not.toHaveBeenCalled();
		expect(awardPointsMock).not.toHaveBeenCalled();
	});

	it('rejects an invalid state code', async () => {
		getMemberProfileMock.mockResolvedValue(null);
		const result = await actions.save({
			request: {
				formData: async () =>
					fd({
						submitFull: '1',
						locationCity: 'Austin',
						locationState: 'Texas',
						trainingGoal: 'Drill weekly.',
						bg_civilian: 'on'
					})
			},
			locals: {},
			platform: { env: {} }
		} as never);
		expect(result?.status).toBe(400);
	});

	it('persists, defaults finder opt-in TRUE for first save when omitted, and awards 20 TP on first completion', async () => {
		getMemberProfileMock.mockResolvedValueOnce(null);
		const completed = makeProfile({
			locationCity: 'Austin',
			locationState: 'TX',
			trainingGoal: 'Drill ECQC weekly.',
			background: {
				civilian: true,
				lawEnforcement: false,
				military: false,
				medical: false,
				other: false
			},
			showInFinder: true,
			profileCompletedAt: Date.now()
		});
		upsertMemberProfileMock.mockResolvedValue(completed);
		awardPointsMock.mockResolvedValue({
			awarded: 20,
			reason: 'awarded',
			totalTp: 20,
			rank: { code: 'unknown_contact', label: 'Unknown Contact', minTp: 0, maxTp: 99 },
			rankChanged: false,
			previousRank: { code: 'unknown_contact', label: 'Unknown Contact', minTp: 0, maxTp: 99 },
			newMilestones: [],
			streak: { current: 1, longest: 1, hitMilestone: null }
		});

		const result = await actions.save({
			request: {
				formData: async () =>
					fd({
						submitFull: '1',
						locationCity: 'Austin',
						locationState: 'tx',
						trainingGoal: 'Drill ECQC weekly.',
						bg_civilian: 'on'
						// showInFinder omitted on purpose
					})
			},
			locals: {},
			platform: { env: {} }
		} as never);

		expect(upsertMemberProfileMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			'user_123',
			expect.objectContaining({
				locationCity: 'Austin',
				locationState: 'TX',
				showInFinder: true
			})
		);
		expect(awardPointsMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			{ memberId: 'user_123', action: 'profile_complete' }
		);
		expect((result as { success: string }).success).toContain('+20 TP');
	});

	it('does not re-award TP when the profile was already complete', async () => {
		const already = makeProfile({
			locationCity: 'Austin',
			locationState: 'TX',
			trainingGoal: 'Drill ECQC weekly.',
			background: {
				civilian: true,
				lawEnforcement: false,
				military: false,
				medical: false,
				other: false
			},
			profileCompletedAt: 1
		});
		getMemberProfileMock.mockResolvedValue(already);
		upsertMemberProfileMock.mockResolvedValue(already);

		await actions.save({
			request: {
				formData: async () =>
					fd({
						submitFull: '1',
						locationCity: 'Austin',
						locationState: 'TX',
						trainingGoal: 'Drill ECQC weekly.',
						bg_civilian: 'on',
						showInFinder: 'on'
					})
			},
			locals: {},
			platform: { env: {} }
		} as never);

		expect(awardPointsMock).not.toHaveBeenCalled();
	});
});
