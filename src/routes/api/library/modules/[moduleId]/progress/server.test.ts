import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCourseModuleByIdMock, getDBFromPlatformMock, upsertMemberModuleProgressMock } =
	vi.hoisted(() => ({
		getCourseModuleByIdMock: vi.fn(),
		getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
		upsertMemberModuleProgressMock: vi.fn()
	}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getCourseModuleById: getCourseModuleByIdMock,
	upsertMemberModuleProgress: upsertMemberModuleProgressMock
}));

vi.mock('$lib/server/rate-limit', () => ({
	checkRateLimit: vi.fn(async () => ({
		allowed: true,
		remaining: 120,
		retryAfterSeconds: 0,
		requestCount: 1
	}))
}));

import { POST } from './+server';

function createUser(
	overrides: Partial<NonNullable<App.Locals['user']>> = {}
): NonNullable<App.Locals['user']> {
	return {
		clerkUserId: 'user_123',
		email: 'member@example.com',
		name: 'Member',
		tier: 'free',
		role: 'member',
		accessStatus: 'active',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

describe('POST /api/library/modules/[moduleId]/progress', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
	});

	it('requires active member access', async () => {
		const response = await POST({
			params: { moduleId: 'module_origin' },
			request: new Request(
				'https://network.shivworks.com/api/library/modules/module_origin/progress',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ currentSeconds: 18 })
				}
			),
			locals: { user: null },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			success: false,
			error: 'Member access required'
		});
	});

	it('rejects modules that the current tier cannot access', async () => {
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_core_platform_brief',
			courseId: 'course_core_skills',
			title: 'Core Skills Platform Brief',
			description: 'Paid module.',
			sortOrder: 1,
			status: 'available',
			videoKind: 'mp4',
			videoUrl: '/videos/shivworks-member-brief.mp4',
			durationLabel: '08 min',
			courseSlug: 'shivworks-core-skills',
			courseTitle: 'ShivWorks Core Skills',
			courseAccessTier: 'member'
		});

		const response = await POST({
			params: { moduleId: 'module_core_platform_brief' },
			request: new Request(
				'https://network.shivworks.com/api/library/modules/module_core_platform_brief/progress',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ currentSeconds: 42, durationSeconds: 300 })
				}
			),
			locals: { user: createUser({ tier: 'free' }) },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			success: false,
			error: 'Upgrade required for this module.'
		});
	});

	it('saves progress for accessible modules', async () => {
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_origin',
			courseId: 'course_foundations',
			title: 'Origin Story',
			description: 'Free preview module.',
			sortOrder: 1,
			status: 'available',
			videoKind: 'mp4',
			videoUrl: '/videos/shivworks-free-preview.mp4',
			durationLabel: '06 min',
			courseSlug: 'shivworks-foundational-modules',
			courseTitle: 'ShivWorks Foundational Modules',
			courseAccessTier: 'free'
		});

		const response = await POST({
			params: { moduleId: 'module_origin' },
			request: new Request(
				'https://network.shivworks.com/api/library/modules/module_origin/progress',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ currentSeconds: 87.2, durationSeconds: 361.7, completed: false })
				}
			),
			locals: { user: createUser({ tier: 'free' }) },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(200);
		expect(upsertMemberModuleProgressMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			{
				memberId: 'user_123',
				moduleId: 'module_origin',
				currentSeconds: 87.2,
				durationSeconds: 361.7,
				completed: false
			}
		);
		expect(await response.json()).toMatchObject({ success: true });
	});
});
