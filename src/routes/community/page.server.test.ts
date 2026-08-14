import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageServerLoad } from './$types';

const {
	getDBFromPlatformMock,
	listCoursesMock,
	listEventsMock,
	listRecentUpdatesMock,
	requirePaidMemberMock,
	resolveRuntimeEnvMock
} = vi.hoisted(() => ({
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	listCoursesMock: vi.fn(),
	listEventsMock: vi.fn(),
	listRecentUpdatesMock: vi.fn(),
	requirePaidMemberMock: vi.fn(() => ({
		clerkUserId: 'user_123',
		email: 'member@example.com',
		name: 'Paid Member',
		tier: 'bronze',
		role: 'member',
		accessStatus: 'active',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	})),
	resolveRuntimeEnvMock: vi.fn(() => ({
		PUBLIC_CIRCLE_COMMUNITY_URL: 'https://community.example.com'
	}))
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/guards', () => ({
	requirePaidMember: requirePaidMemberMock
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: resolveRuntimeEnvMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	listCourses: listCoursesMock,
	listEvents: listEventsMock,
	listRecentUpdates: listRecentUpdatesMock
}));

import { load } from './+page.server';

type CommunityPageLoadResult = Exclude<Awaited<ReturnType<PageServerLoad>>, void>;

describe('community page load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		listCoursesMock.mockResolvedValue([
			{
				id: 'course_foundations',
				slug: 'shivworks-foundational-modules',
				title: 'ShivWorks Foundational Modules',
				description: 'Foundation.',
				status: 'available',
				sortOrder: 1,
				badgeText: 'Watch now',
				artworkUrl: null,
				courseKind: 'course',
				accessTier: 'member',
				totalModuleCount: 2,
				availableModuleCount: 1,
				roadmapModuleCount: 1,
				completedModuleCount: 0,
				startedModuleCount: 0
			}
		]);
		listEventsMock.mockResolvedValue([
			{
				id: 'event_member_live',
				slug: 'member-live',
				title: 'Member live briefing',
				description: 'Live session.',
				eventKind: 'livestream',
				accessTier: 'member',
				status: 'scheduled',
				startsAt: Date.now() + 3_600_000,
				endsAt: null,
				locationType: 'youtube',
				embedUrl: null,
				bookingUrl: null,
				reminderEnabled: true
			}
		]);
		listRecentUpdatesMock.mockResolvedValue([
			{
				id: 'update_1',
				title: 'Community brief',
				bodyMarkdown: 'The member discussion lane is active.',
				audience: 'member',
				publishedAt: Date.now(),
				authorName: 'Admin'
			}
		]);
	});

	it('loads community context for paid members', async () => {
		const result = (await load({
			locals: {},
			platform: { env: {} }
		} as never)) as CommunityPageLoadResult;

		expect(requirePaidMemberMock).toHaveBeenCalledWith({}, '/community');
		expect(listCoursesMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ clerkUserId: 'user_123' })
		);
		expect(listEventsMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ clerkUserId: 'user_123' })
		);
		expect(listRecentUpdatesMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ clerkUserId: 'user_123' }),
			4
		);
		expect(result).toMatchObject({
			circleUrl: 'https://community.example.com'
		});
		expect(result.courses).toHaveLength(1);
		expect(result.events).toHaveLength(1);
		expect(result.updates).toHaveLength(1);
	});
});
