import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageServerLoad } from './$types';

const {
	getDBFromPlatformMock,
	getGamificationForMemberMock,
	getLatestModuleProgressForMemberMock,
	getMemberProfileMock,
	getRsvpForMemberMock,
	listCoursesMock,
	listEventsMock,
	listRecentUpdatesMock,
	requireEntitledMock
} = vi.hoisted(() => ({
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	getGamificationForMemberMock: vi.fn(),
	getLatestModuleProgressForMemberMock: vi.fn(),
	getMemberProfileMock: vi.fn(),
	getRsvpForMemberMock: vi.fn(),
	listCoursesMock: vi.fn(),
	listEventsMock: vi.fn(),
	listRecentUpdatesMock: vi.fn(),
	requireEntitledMock: vi.fn(() => ({
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

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/guards', () => ({
	requireEntitled: requireEntitledMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getGamificationForMember: getGamificationForMemberMock,
	getLatestModuleProgressForMember: getLatestModuleProgressForMemberMock,
	getMemberProfile: getMemberProfileMock,
	getRsvpForMember: getRsvpForMemberMock,
	listCourses: listCoursesMock,
	listEvents: listEventsMock,
	listRecentUpdates: listRecentUpdatesMock
}));

import { load } from './+page.server';

type DashboardLoadResult = Exclude<Awaited<ReturnType<PageServerLoad>>, void>;

const baseCourse = {
	id: 'course_foundations',
	slug: 'shivworks-foundational-modules',
	title: 'ShivWorks Foundational Modules',
	description: 'Foundation.',
	status: 'available' as const,
	sortOrder: 1,
	badgeText: 'Watch now',
	artworkUrl: null,
	courseKind: 'course' as const,
	accessTier: 'free' as const,
	totalModuleCount: 2,
	availableModuleCount: 1,
	roadmapModuleCount: 1,
	completedModuleCount: 0,
	startedModuleCount: 0
};

describe('dashboard page load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		listRecentUpdatesMock.mockResolvedValue([]);
		listCoursesMock.mockResolvedValue([baseCourse]);
		listEventsMock.mockResolvedValue([]);
		getLatestModuleProgressForMemberMock.mockResolvedValue(null);
		getGamificationForMemberMock.mockResolvedValue({
			memberId: 'user_123',
			rank: 'Recruit',
			trainingPoints: 40,
			streakDays: 2,
			lastActivityDate: null,
			updatedAt: new Date().toISOString()
		});
		getMemberProfileMock.mockResolvedValue(null);
		getRsvpForMemberMock.mockResolvedValue({});
	});

	it('returns hub data with experience countdown and course slice', async () => {
		const result = (await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: requireEntitledMock()
			},
			platform: { env: {} }
		} as never)) as DashboardLoadResult;

		expect(result.user.name).toBe('Member');
		expect(result.experience.countdown).toBeDefined();
		expect(result.experience.upcoming).toBeDefined();
		expect(result.activity.gamification.trainingPoints).toBe(40);
		expect(result.courses).toHaveLength(1);
		expect(result.courseCounts.available).toBe(1);
		expect(result.profileComplete).toBe(false);
	});

	it('requires entitled access for dashboard', async () => {
		await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: requireEntitledMock()
			},
			platform: { env: {} }
		} as never);

		expect(requireEntitledMock).toHaveBeenCalledWith(
			expect.objectContaining({ user: expect.any(Object) }),
			'/dashboard'
		);
	});
});
