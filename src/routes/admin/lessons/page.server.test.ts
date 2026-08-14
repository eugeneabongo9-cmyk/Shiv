import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	bumpCatalogCacheVersionMock,
	createCourseModuleMock,
	createEpisodeFromStreamReferenceMock,
	getCourseModuleByIdMock,
	getDBFromPlatformMock,
	syncLessonEpisodeStatusMock,
	updateCourseModuleMock
} = vi.hoisted(() => ({
	bumpCatalogCacheVersionMock: vi.fn(),
	createCourseModuleMock: vi.fn(),
	createEpisodeFromStreamReferenceMock: vi.fn(),
	getCourseModuleByIdMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	syncLessonEpisodeStatusMock: vi.fn(),
	updateCourseModuleMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/guards', () => ({
	requireAdmin: vi.fn()
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: vi.fn(() => ({}))
}));

vi.mock('$lib/server/stream', () => ({
	getStreamVideoDetails: vi.fn(),
	parseStreamUidFromReference: vi.fn((value: string) => value)
}));

vi.mock('$lib/server/db/shivworks', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/db/shivworks')>(
		'$lib/server/db/shivworks'
	);
	return {
		...actual,
		bumpCatalogCacheVersion: bumpCatalogCacheVersionMock,
		createCourseModule: createCourseModuleMock,
		createEpisodeFromStreamReference: createEpisodeFromStreamReferenceMock,
		getCourseModuleById: getCourseModuleByIdMock,
		syncLessonEpisodeStatus: syncLessonEpisodeStatusMock,
		updateCourseModule: updateCourseModuleMock,
		listAdminLessons: vi.fn(async () => []),
		listCourses: vi.fn(async () => [])
	};
});

import { actions } from './+page.server';

describe('admin lesson actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createCourseModuleMock.mockResolvedValue({
			id: 'module_new',
			courseId: 'course_foundations',
			title: 'New lesson',
			description: 'Lesson copy.',
			sortOrder: 3,
			status: 'coming_soon',
			videoKind: 'none',
			videoUrl: null,
			durationLabel: null,
			thumbnailUrl: null,
			publishedAt: null,
			accessTier: 'member'
		});
	});

	it('creates a draft lesson and bumps the catalog cache', async () => {
		const formData = new FormData();
		formData.set('courseId', 'course_foundations');
		formData.set('title', 'New lesson');
		formData.set('description', 'Lesson copy.');
		formData.set('status', 'coming_soon');
		formData.set('accessTier', 'member');

		const result = await actions.createLesson({
			request: { formData: async () => formData },
			locals: { user: { clerkUserId: 'admin_1', role: 'admin' } },
			platform: { env: { KV: {} } }
		} as never);

		expect(createCourseModuleMock).toHaveBeenCalled();
		expect(updateCourseModuleMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({
				moduleId: 'module_new',
				status: 'coming_soon'
			})
		);
		expect(syncLessonEpisodeStatusMock).not.toHaveBeenCalled();
		expect(bumpCatalogCacheVersionMock).toHaveBeenCalled();
		expect(result).toMatchObject({ success: 'Lesson created.' });
	});

	it('publishes a lesson and syncs episode status', async () => {
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_new',
			courseId: 'course_foundations',
			title: 'New lesson',
			description: 'Lesson copy.',
			sortOrder: 3,
			status: 'coming_soon',
			videoKind: 'none',
			videoUrl: null,
			durationLabel: null,
			thumbnailUrl: null,
			publishedAt: null,
			accessTier: 'member',
			courseSlug: 'shivworks-foundational-modules',
			courseTitle: 'ShivWorks Foundational Modules',
			courseAccessTier: 'free'
		});

		const formData = new FormData();
		formData.set('moduleId', 'module_new');
		formData.set('title', 'New lesson');
		formData.set('status', 'available');
		formData.set('accessTier', 'member');

		const result = await actions.updateLesson({
			request: { formData: async () => formData },
			locals: { user: { clerkUserId: 'admin_1', role: 'admin' } },
			platform: { env: { KV: {} } }
		} as never);

		expect(updateCourseModuleMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({
				moduleId: 'module_new',
				status: 'available'
			})
		);
		expect(syncLessonEpisodeStatusMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			'module_new',
			'available'
		);
		expect(result).toMatchObject({ success: 'Lesson updated.' });
	});
});
