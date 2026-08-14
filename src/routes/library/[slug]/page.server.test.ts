import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageServerLoad } from './$types';

const {
	getCourseBySlugMock,
	getDBFromPlatformMock,
	getMemberModuleNoteMock,
	listCourseModuleEpisodesMock,
	listCourseModulesMock,
	listCoursesMock,
	listMemberEpisodeProgressMock,
	listMemberModuleProgressMock
} = vi.hoisted(() => ({
	getCourseBySlugMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	getMemberModuleNoteMock: vi.fn(),
	listCourseModuleEpisodesMock: vi.fn(),
	listCourseModulesMock: vi.fn(),
	listCoursesMock: vi.fn(),
	listMemberEpisodeProgressMock: vi.fn(),
	listMemberModuleProgressMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getCourseBySlug: getCourseBySlugMock,
	getMemberModuleNote: getMemberModuleNoteMock,
	listCourseModuleEpisodes: listCourseModuleEpisodesMock,
	listCourseModules: listCourseModulesMock,
	listCourses: listCoursesMock,
	listMemberEpisodeProgress: listMemberEpisodeProgressMock,
	listMemberModuleProgress: listMemberModuleProgressMock
}));

import { load } from './+page.server';

type CoursePageLoadResult = Exclude<Awaited<ReturnType<PageServerLoad>>, void>;

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

describe('library course page load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		listCourseModuleEpisodesMock.mockResolvedValue([]);
		listMemberEpisodeProgressMock.mockResolvedValue([]);
		listMemberModuleProgressMock.mockResolvedValue([]);
		getMemberModuleNoteMock.mockResolvedValue(null);
		listCoursesMock.mockResolvedValue([]);
	});

	it('loads a member course and selects the first playable module by default', async () => {
		getCourseBySlugMock.mockResolvedValue({
			id: 'course_foundations',
			slug: 'shivworks-origin-story',
			title: 'ShivWorks Origin Story',
			description: 'Origin story module.',
			status: 'available',
			sortOrder: 1,
			badgeText: 'Watch now',
			artworkUrl: null,
			courseKind: 'course',
			accessTier: 'member'
		});
		listCourseModulesMock.mockResolvedValue([
			{
				id: 'module_origin',
				courseId: 'course_foundations',
				title: 'Origin Story',
				description: 'Origin module.',
				sortOrder: 1,
				status: 'available',
				videoKind: 'embed',
				videoUrl: 'https://iframe.cloudflarestream.com/9d41640818371252d2387bd0fc8a3036',
				durationLabel: '26 min'
			}
		]);

		const result = (await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: createUser()
			},
			params: { slug: 'shivworks-origin-story' },
			platform: { env: {} },
			url: new URL('https://network.shivworks.com/library/shivworks-origin-story')
		} as never)) as CoursePageLoadResult;

		expect(result.course.slug).toBe('shivworks-origin-story');
		expect(result.selectedModuleId).toBe('module_origin');
		expect(result.episodes).toEqual([]);
		expect(result.progressByEpisode).toEqual({});
		expect(result.progressByModule).toEqual({});
		expect(listCourseModulesMock).toHaveBeenCalledWith({ kind: 'db' }, 'course_foundations', {
			publishedOnly: true
		});
		expect(listCourseModuleEpisodesMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			{ courseId: 'course_foundations', publishedOnly: true }
		);
	});

	it('respects the requested module when it belongs to the course', async () => {
		getCourseBySlugMock.mockResolvedValue({
			id: 'course_cap',
			slug: 'criminal-assault-paradigm',
			title: 'Criminal Assault Paradigm (CAP)',
			description: 'Conceptual foundation.',
			status: 'available',
			sortOrder: 2,
			badgeText: 'Watch now',
			artworkUrl: null,
			courseKind: 'course',
			accessTier: 'member'
		});
		listCourseModulesMock.mockResolvedValue([
			{
				id: 'module_cap',
				courseId: 'course_cap',
				title: 'Criminal Assault Paradigm',
				description: 'Conceptual foundation.',
				sortOrder: 1,
				status: 'available',
				videoKind: 'mp4',
				videoUrl: '/videos/shivworks-free-preview.mp4',
				durationLabel: '08 min'
			}
		]);

		const result = (await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: createUser()
			},
			params: { slug: 'criminal-assault-paradigm' },
			platform: { env: {} },
			url: new URL(
				'https://network.shivworks.com/library/criminal-assault-paradigm?module=module_cap'
			)
		} as never)) as CoursePageLoadResult;

		expect(result.selectedModuleId).toBe('module_cap');
	});

	it('returns saved progress for modules in the course', async () => {
		getCourseBySlugMock.mockResolvedValue({
			id: 'course_foundations',
			slug: 'shivworks-origin-story',
			title: 'ShivWorks Origin Story',
			description: 'Origin story module.',
			status: 'available',
			sortOrder: 1,
			badgeText: 'Watch now',
			artworkUrl: null,
			courseKind: 'course',
			accessTier: 'member'
		});
		listCourseModulesMock.mockResolvedValue([
			{
				id: 'module_origin',
				courseId: 'course_foundations',
				title: 'Origin Story',
				description: 'Origin module.',
				sortOrder: 1,
				status: 'available',
				videoKind: 'embed',
				videoUrl: 'https://iframe.cloudflarestream.com/9d41640818371252d2387bd0fc8a3036',
				durationLabel: '26 min'
			}
		]);
		listCourseModuleEpisodesMock.mockResolvedValue([
			{
				id: 'episode_origin',
				courseId: 'course_foundations',
				courseSlug: 'shivworks-origin-story',
				courseTitle: 'ShivWorks Origin Story',
				courseAccessTier: 'member',
				moduleId: 'module_origin',
				moduleTitle: 'Origin Story',
				mediaAssetId: 'media_origin',
				episodeNumber: 1,
				title: 'Origin Story',
				description: 'Preview module.',
				status: 'available',
				accessTier: 'member',
				sortOrder: 1,
				durationLabel: '26 min',
				media: null
			}
		]);
		listMemberModuleProgressMock.mockResolvedValue([
			{
				moduleId: 'module_origin',
				currentSeconds: 85,
				durationSeconds: 360,
				completedAt: null,
				updatedAt: Date.now()
			}
		]);
		listMemberEpisodeProgressMock.mockResolvedValue([
			{
				episodeId: 'episode_origin',
				currentSeconds: 12,
				durationSeconds: 77,
				completedAt: null,
				updatedAt: Date.now()
			}
		]);

		const result = (await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: createUser({ tier: 'bronze' })
			},
			params: { slug: 'shivworks-origin-story' },
			platform: { env: {} },
			url: new URL('https://network.shivworks.com/library/shivworks-origin-story')
		} as never)) as CoursePageLoadResult;

		expect(result.progressByModule.module_origin).toMatchObject({
			currentSeconds: 85,
			durationSeconds: 360
		});
		expect(result.episodes).toHaveLength(1);
		expect(result.progressByEpisode.episode_origin).toMatchObject({
			currentSeconds: 12,
			durationSeconds: 77
		});
	});

	it('calculates course progress from completed episodes inside a module', async () => {
		getCourseBySlugMock.mockResolvedValue({
			id: 'course_foundations',
			slug: 'shivworks-origin-story',
			title: 'ShivWorks Origin Story',
			description: 'Origin story module.',
			status: 'available',
			sortOrder: 1,
			badgeText: 'Watch now',
			artworkUrl: null,
			courseKind: 'course',
			accessTier: 'member'
		});
		listCourseModulesMock.mockResolvedValue([
			{
				id: 'module_origin',
				courseId: 'course_foundations',
				title: 'Origin Story',
				description: 'Origin module.',
				sortOrder: 1,
				status: 'available',
				videoKind: null,
				videoUrl: null,
				durationLabel: '2 min'
			}
		]);
		listCourseModuleEpisodesMock.mockResolvedValue([
			{
				id: 'episode_one',
				courseId: 'course_foundations',
				courseSlug: 'shivworks-origin-story',
				courseTitle: 'ShivWorks Origin Story',
				courseAccessTier: 'member',
				moduleId: 'module_origin',
				moduleTitle: 'Origin Story',
				mediaAssetId: 'media_one',
				episodeNumber: 1,
				title: 'Episode one',
				description: '',
				status: 'available',
				accessTier: 'member',
				sortOrder: 1,
				durationLabel: '1 min',
				media: { ingestStatus: 'ready', durationSeconds: 60 }
			},
			{
				id: 'episode_two',
				courseId: 'course_foundations',
				courseSlug: 'shivworks-origin-story',
				courseTitle: 'ShivWorks Origin Story',
				courseAccessTier: 'member',
				moduleId: 'module_origin',
				moduleTitle: 'Origin Story',
				mediaAssetId: 'media_two',
				episodeNumber: 2,
				title: 'Episode two',
				description: '',
				status: 'available',
				accessTier: 'member',
				sortOrder: 2,
				durationLabel: '1 min',
				media: { ingestStatus: 'ready', durationSeconds: 60 }
			}
		]);
		listMemberEpisodeProgressMock.mockResolvedValue([
			{
				episodeId: 'episode_one',
				currentSeconds: 60,
				durationSeconds: 60,
				completedAt: Date.now(),
				updatedAt: Date.now()
			}
		]);

		const result = (await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: createUser({ tier: 'bronze' })
			},
			params: { slug: 'shivworks-origin-story' },
			platform: { env: {} },
			url: new URL('https://network.shivworks.com/library/shivworks-origin-story')
		} as never)) as CoursePageLoadResult;

		expect(result.courseCompletionPercent).toBe(50);
		expect(result.courseCompleted).toBe(false);
	});

	it('marks paid courses as access locked for free members without loading progress', async () => {
		getCourseBySlugMock.mockResolvedValue({
			id: 'course_core_skills',
			slug: 'shivworks-core-skills',
			title: 'ShivWorks Core Skills',
			description: 'Paid course.',
			status: 'available',
			sortOrder: 2,
			badgeText: 'Member video',
			artworkUrl: null,
			courseKind: 'course',
			accessTier: 'member'
		});
		listCourseModulesMock.mockResolvedValue([
			{
				id: 'module_core_platform_brief',
				courseId: 'course_core_skills',
				title: 'Core Skills Platform Brief',
				description: 'Member walkthrough.',
				sortOrder: 1,
				status: 'available',
				videoKind: 'mp4',
				videoUrl: '/videos/shivworks-member-brief.mp4',
				durationLabel: '08 min'
			}
		]);

		const result = (await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: createUser()
			},
			params: { slug: 'shivworks-core-skills' },
			platform: { env: {} },
			url: new URL('https://network.shivworks.com/library/shivworks-core-skills')
		} as never)) as CoursePageLoadResult;

		expect(result.accessLocked).toBe(true);
		expect(result.progressByModule).toEqual({});
		expect(result.moduleNote).toBeNull();
		expect(listMemberModuleProgressMock).not.toHaveBeenCalled();
	});
});
