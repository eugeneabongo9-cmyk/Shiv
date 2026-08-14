import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	getCourseModuleByIdMock,
	getDBFromPlatformMock,
	getMemberModuleNoteMock,
	upsertMemberModuleNoteMock
} = vi.hoisted(() => ({
	getCourseModuleByIdMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	getMemberModuleNoteMock: vi.fn(),
	upsertMemberModuleNoteMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getCourseModuleById: getCourseModuleByIdMock,
	getMemberModuleNote: getMemberModuleNoteMock,
	upsertMemberModuleNote: upsertMemberModuleNoteMock
}));

vi.mock('$lib/server/rate-limit', () => ({
	checkRateLimit: vi.fn(async () => ({
		allowed: true,
		remaining: 30,
		retryAfterSeconds: 0,
		requestCount: 1
	}))
}));

import { GET, POST } from './+server';

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

const accessibleModule = {
	id: 'module_origin',
	courseId: 'course_foundations',
	title: 'Origin Story',
	description: 'Preview module.',
	sortOrder: 1,
	status: 'available' as const,
	videoKind: 'mp4' as const,
	videoUrl: '/videos/shivworks-free-preview.mp4',
	durationLabel: '06 min',
	courseSlug: 'shivworks-foundational-modules',
	courseTitle: 'ShivWorks Foundational Modules',
	courseAccessTier: 'free' as const
};

describe('module notes API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		getCourseModuleByIdMock.mockResolvedValue(accessibleModule);
	});

	it('GET requires active member access', async () => {
		const response = await GET({
			params: { moduleId: 'module_origin' },
			locals: { user: null },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(403);
	});

	it('GET returns saved note body', async () => {
		getMemberModuleNoteMock.mockResolvedValue({
			moduleId: 'module_origin',
			body: 'Grip notes from class.',
			updatedAt: 1_700_000_000_000
		});

		const response = await GET({
			params: { moduleId: 'module_origin' },
			locals: { user: createUser() },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			success: true,
			data: {
				body: 'Grip notes from class.',
				updatedAt: 1_700_000_000_000
			}
		});
	});

	it('POST rejects modules the tier cannot access', async () => {
		getCourseModuleByIdMock.mockResolvedValue({
			...accessibleModule,
			courseAccessTier: 'member'
		});

		const response = await POST({
			params: { moduleId: 'module_origin' },
			request: new Request(
				'https://network.shivworks.com/api/library/modules/module_origin/notes',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ body: 'Should fail.' })
				}
			),
			locals: { user: createUser({ tier: 'free' }) },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(403);
		expect(upsertMemberModuleNoteMock).not.toHaveBeenCalled();
	});

	it('POST persists notes for accessible modules', async () => {
		upsertMemberModuleNoteMock.mockResolvedValue({
			moduleId: 'module_origin',
			body: 'Saved note.',
			updatedAt: 1_700_000_111_000
		});

		const response = await POST({
			params: { moduleId: 'module_origin' },
			request: new Request(
				'https://network.shivworks.com/api/library/modules/module_origin/notes',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ body: 'Saved note.' })
				}
			),
			locals: { user: createUser() },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(200);
		expect(upsertMemberModuleNoteMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			{
				memberId: 'user_123',
				moduleId: 'module_origin',
				body: 'Saved note.'
			}
		);
		expect(await response.json()).toMatchObject({
			success: true,
			data: { body: 'Saved note.', updatedAt: 1_700_000_111_000 }
		});
	});
});
