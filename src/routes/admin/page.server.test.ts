import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	bumpCatalogCacheVersionMock,
	createCourseMock,
	createCourseModuleMock,
	createEventMock,
	deleteCourseIfEmptyMock,
	deleteCourseModuleIfEmptyMock,
	discardFailedUploadEpisodeMock,
	getCourseModuleByIdMock,
	getDBFromPlatformMock,
	listContentReleaseNotificationRecipientsMock,
	listCourseModuleEpisodesMock,
	listCoursesMock,
	nudgeAwaitingSignupImportsMock,
	resolveRuntimeEnvMock,
	sendContentReleaseEmailMock,
	updateCourseModuleMock,
	updateCourseStatusMock
} = vi.hoisted(() => ({
	bumpCatalogCacheVersionMock: vi.fn(),
	createCourseMock: vi.fn(),
	createCourseModuleMock: vi.fn(),
	createEventMock: vi.fn(),
	deleteCourseIfEmptyMock: vi.fn(),
	deleteCourseModuleIfEmptyMock: vi.fn(),
	discardFailedUploadEpisodeMock: vi.fn(),
	getCourseModuleByIdMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	listContentReleaseNotificationRecipientsMock: vi.fn(),
	listCourseModuleEpisodesMock: vi.fn(() =>
		Promise.resolve([] as Array<{ id: string; media: { ingestStatus: string } | null }>)
	),
	listCoursesMock: vi.fn(() => Promise.resolve([] as Array<Record<string, unknown>>)),
	nudgeAwaitingSignupImportsMock: vi.fn(),
	resolveRuntimeEnvMock: vi.fn(() => ({ RESEND_API_KEY: 'test' })),
	sendContentReleaseEmailMock: vi.fn(),
	updateCourseModuleMock: vi.fn(),
	updateCourseStatusMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/guards', () => ({
	requireAdmin: vi.fn()
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: resolveRuntimeEnvMock
}));

vi.mock('$lib/server/import-onboarding-nudge', () => ({
	nudgeAwaitingSignupImports: nudgeAwaitingSignupImportsMock,
	nudgeImportedMemberOnboarding: vi.fn()
}));

vi.mock('$lib/email', async () => {
	const actual = await vi.importActual<typeof import('$lib/email')>('$lib/email');
	return {
		...actual,
		sendContentReleaseEmail: sendContentReleaseEmailMock
	};
});

vi.mock('$lib/server/db/shivworks', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/db/shivworks')>(
		'$lib/server/db/shivworks'
	);
	return {
		...actual,
		bumpCatalogCacheVersion: bumpCatalogCacheVersionMock,
		createCourse: createCourseMock,
		createCourseModule: createCourseModuleMock,
		createEvent: createEventMock,
		deleteCourseIfEmpty: deleteCourseIfEmptyMock,
		deleteCourseModuleIfEmpty: deleteCourseModuleIfEmptyMock,
		discardFailedUploadEpisode: discardFailedUploadEpisodeMock,
		getCourseModuleById: getCourseModuleByIdMock,
		listContentReleaseNotificationRecipients: listContentReleaseNotificationRecipientsMock,
		listCourseModuleEpisodes: listCourseModuleEpisodesMock,
		listCourses: listCoursesMock,
		updateCourseModule: updateCourseModuleMock,
		updateCourseStatus: updateCourseStatusMock
	};
});

import { actions } from './+page.server';

describe('admin module update action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		listCourseModuleEpisodesMock.mockResolvedValue([]);
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_origin',
			courseId: 'course_foundations',
			title: 'Origin Story',
			description: 'Original preview copy.',
			sortOrder: 1,
			status: 'coming_soon',
			videoKind: 'mp4',
			videoUrl: '/videos/shivworks-free-preview.mp4',
			durationLabel: '06 min',
			courseSlug: 'shivworks-foundational-modules',
			courseTitle: 'ShivWorks Foundational Modules',
			courseAccessTier: 'free'
		});
		listContentReleaseNotificationRecipientsMock.mockResolvedValue([
			{
				memberId: 'member_1',
				email: 'member1@example.com',
				name: 'Member One',
				tier: 'free',
				role: 'member'
			},
			{
				memberId: 'member_2',
				email: 'member2@example.com',
				name: 'Member Two',
				tier: 'bronze',
				role: 'member'
			}
		]);
	});

	it('sends release alerts when a module transitions to available', async () => {
		const formData = new FormData();
		formData.set('moduleId', 'module_origin');
		formData.set('title', 'Origin Story');
		formData.set('description', 'Now live for the free lane.');
		formData.set('status', 'available');
		formData.set('videoKind', 'mp4');
		formData.set('videoUrl', '/videos/shivworks-free-preview.mp4');
		formData.set('durationLabel', '06 min');
		formData.set('sendReleaseEmail', 'on');

		const result = await actions.updateModule({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(updateCourseModuleMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({
				moduleId: 'module_origin',
				status: 'available'
			})
		);
		expect(listContentReleaseNotificationRecipientsMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			'free'
		);
		expect(sendContentReleaseEmailMock).toHaveBeenCalledTimes(2);
		expect(result).toMatchObject({
			success: 'Course module updated and 2 release alert emails sent.'
		});
	});

	it('does not send release alerts when the module is already live', async () => {
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_origin',
			courseId: 'course_foundations',
			title: 'Origin Story',
			description: 'Original preview copy.',
			sortOrder: 1,
			status: 'available',
			videoKind: 'mp4',
			videoUrl: '/videos/shivworks-free-preview.mp4',
			durationLabel: '06 min',
			courseSlug: 'shivworks-foundational-modules',
			courseTitle: 'ShivWorks Foundational Modules',
			courseAccessTier: 'free'
		});

		const formData = new FormData();
		formData.set('moduleId', 'module_origin');
		formData.set('title', 'Origin Story');
		formData.set('status', 'available');
		formData.set('videoKind', 'mp4');
		formData.set('sendReleaseEmail', 'on');

		const result = await actions.updateModule({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(listContentReleaseNotificationRecipientsMock).not.toHaveBeenCalled();
		expect(sendContentReleaseEmailMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			success: 'Course module updated. Release alerts send only when a module moves live.'
		});
	});

	it('blocks publishing an episode-based module until Cloudflare reports an episode ready', async () => {
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_uploads',
			courseId: 'course_spotlight',
			title: 'Spotlight Episode 1',
			description: 'Episode-based module.',
			sortOrder: 1,
			status: 'coming_soon',
			videoKind: 'none',
			videoUrl: null,
			durationLabel: null,
			courseSlug: 'spotlight-series',
			courseTitle: 'Spotlight Series',
			courseAccessTier: 'member'
		});
		listCourseModuleEpisodesMock.mockResolvedValue([
			{ id: 'episode_1', media: { ingestStatus: 'processing' } }
		]);

		const formData = new FormData();
		formData.set('moduleId', 'module_uploads');
		formData.set('title', 'Spotlight Episode 1');
		formData.set('status', 'available');
		formData.set('videoKind', 'none');

		const result = await actions.updateModule({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(updateCourseModuleMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			status: 400,
			data: { error: expect.stringContaining('blocked until Cloudflare Stream') }
		});
	});

	it('allows publishing an episode-based module once an episode is ready', async () => {
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_uploads',
			courseId: 'course_spotlight',
			title: 'Spotlight Episode 1',
			description: 'Episode-based module.',
			sortOrder: 1,
			status: 'coming_soon',
			videoKind: 'none',
			videoUrl: null,
			durationLabel: null,
			courseSlug: 'spotlight-series',
			courseTitle: 'Spotlight Series',
			courseAccessTier: 'member'
		});
		listCourseModuleEpisodesMock.mockResolvedValue([
			{ id: 'episode_1', media: { ingestStatus: 'ready' } }
		]);

		const formData = new FormData();
		formData.set('moduleId', 'module_uploads');
		formData.set('title', 'Spotlight Episode 1');
		formData.set('status', 'available');
		formData.set('videoKind', 'none');

		const result = await actions.updateModule({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(updateCourseModuleMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ moduleId: 'module_uploads', status: 'available' })
		);
		expect(result).toMatchObject({ success: 'Course module updated.' });
	});
});

describe('admin discardUpload action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
	});

	it('requires an episode id', async () => {
		const formData = new FormData();

		const result = await actions.discardUpload({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(discardFailedUploadEpisodeMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({ status: 400 });
	});

	it('discards a failed or pending upload so the destination can be reused', async () => {
		discardFailedUploadEpisodeMock.mockResolvedValue({ mediaAssetId: 'media_1' });

		const formData = new FormData();
		formData.set('episodeId', 'episode_1');

		const result = await actions.discardUpload({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(discardFailedUploadEpisodeMock).toHaveBeenCalledWith({ kind: 'db' }, 'episode_1');
		expect(result).toMatchObject({
			success: expect.stringContaining('discarded')
		});
	});

	it('surfaces a useful error when the upload cannot be discarded', async () => {
		discardFailedUploadEpisodeMock.mockRejectedValue(
			new Error(
				'Only a pending or failed upload can be discarded. Ready or processing media is protected.'
			)
		);

		const formData = new FormData();
		formData.set('episodeId', 'episode_1');

		const result = await actions.discardUpload({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: { error: expect.stringContaining('Ready or processing media is protected') }
		});
	});
});

describe('admin createCourse action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
	});

	function buildFormData(overrides: Record<string, string> = {}): FormData {
		const formData = new FormData();
		const defaults: Record<string, string> = {
			title: 'Spotlight Series',
			slug: 'spotlight-series',
			description: 'Internal spotlight interviews.',
			accessTier: 'member',
			courseKind: 'series',
			status: 'coming_soon'
		};
		for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
			formData.set(key, value);
		}
		return formData;
	}

	it('requires a title and description', async () => {
		const result = await actions.createCourse({
			request: { formData: async () => buildFormData({ title: '', description: '' }) },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(createCourseMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({ status: 400 });
	});

	it('creates a new course/series that defaults to hidden and is immediately selectable', async () => {
		createCourseMock.mockResolvedValue({ id: 'course_spotlight_1', title: 'Spotlight Series' });

		const result = await actions.createCourse({
			request: { formData: async () => buildFormData() },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(createCourseMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({
				title: 'Spotlight Series',
				slug: 'spotlight-series',
				accessTier: 'member',
				courseKind: 'series',
				status: 'coming_soon'
			})
		);
		expect(bumpCatalogCacheVersionMock).toHaveBeenCalled();
		expect(result).toMatchObject({
			newCourseId: 'course_spotlight_1',
			newModuleId: null
		});
	});

	it('also creates the first module when requested, returning it as immediately selectable', async () => {
		createCourseMock.mockResolvedValue({ id: 'course_spotlight_1', title: 'Spotlight Series' });
		createCourseModuleMock.mockResolvedValue({ id: 'module_spotlight_1', title: 'Episode 1' });

		const result = await actions.createCourse({
			request: {
				formData: async () => buildFormData({ firstModuleTitle: 'Episode 1' })
			},
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(createCourseModuleMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ courseId: 'course_spotlight_1', title: 'Episode 1' })
		);
		expect(result).toMatchObject({
			newCourseId: 'course_spotlight_1',
			newModuleId: 'module_spotlight_1'
		});
	});

	it('returns a 409 with a useful message when the slug already exists', async () => {
		createCourseMock.mockRejectedValue(
			new Error(
				'A course or series with the slug "spotlight-series" already exists. Choose a different slug.'
			)
		);

		const result = await actions.createCourse({
			request: { formData: async () => buildFormData() },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(result).toMatchObject({
			status: 409,
			data: { error: expect.stringContaining('already exists') }
		});
	});

	it('returns a 400 with a useful message for an invalid slug', async () => {
		createCourseMock.mockRejectedValue(
			new Error(
				'Slug must use lowercase letters, numbers, and single hyphens (e.g. knife-defense-101).'
			)
		);

		const result = await actions.createCourse({
			request: { formData: async () => buildFormData({ slug: 'Not A Slug!' }) },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: { error: expect.stringContaining('Slug must use') }
		});
	});
});

describe('admin createModule action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
	});

	function buildFormData(overrides: Record<string, string> = {}): FormData {
		const formData = new FormData();
		const defaults: Record<string, string> = {
			courseId: 'course_spotlight_1',
			title: 'Episode 2',
			accessTier: 'member'
		};
		for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
			formData.set(key, value);
		}
		return formData;
	}

	it('requires a destination course and a title', async () => {
		const result = await actions.createModule({
			request: { formData: async () => buildFormData({ courseId: '' }) },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(createCourseModuleMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({ status: 400 });
	});

	it('creates a module in an existing course, immediately selectable for uploads', async () => {
		createCourseModuleMock.mockResolvedValue({ id: 'module_spotlight_2', title: 'Episode 2' });

		const result = await actions.createModule({
			request: { formData: async () => buildFormData() },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(createCourseModuleMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ courseId: 'course_spotlight_1', title: 'Episode 2' })
		);
		expect(bumpCatalogCacheVersionMock).toHaveBeenCalled();
		expect(result).toMatchObject({ newModuleId: 'module_spotlight_2' });
	});

	it('returns a useful error when module creation fails', async () => {
		createCourseModuleMock.mockRejectedValue(new Error('Course not found.'));

		const result = await actions.createModule({
			request: { formData: async () => buildFormData() },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: { error: expect.stringContaining('Course not found') }
		});
	});
});

describe('admin archive and delete catalog actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
	});

	it('archives a course and bumps the catalog cache', async () => {
		listCoursesMock.mockResolvedValue([
			{
				id: 'course_qa',
				title: 'Upload System QA Course',
				badgeText: 'QA',
				accessTier: 'member'
			}
		]);

		const formData = new FormData();
		formData.set('courseId', 'course_qa');

		const result = await actions.archiveCourse({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: { KV: { kind: 'kv' } } }
		} as never);

		expect(updateCourseStatusMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			'course_qa',
			'archived',
			'QA',
			'member'
		);
		expect(bumpCatalogCacheVersionMock).toHaveBeenCalledWith({ kind: 'kv' });
		expect(result).toMatchObject({ success: expect.stringContaining('archived') });
	});

	it('archives a module while preserving its media fields', async () => {
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_probe',
			title: 'Module 1: Upload Probe',
			description: 'QA module',
			videoKind: 'none',
			videoUrl: null,
			durationLabel: null
		});

		const formData = new FormData();
		formData.set('moduleId', 'module_probe');

		const result = await actions.archiveModule({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: { KV: { kind: 'kv' } } }
		} as never);

		expect(updateCourseModuleMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({
				moduleId: 'module_probe',
				title: 'Module 1: Upload Probe',
				status: 'archived',
				videoKind: 'none'
			})
		);
		expect(result).toMatchObject({ success: expect.stringContaining('archived') });
	});

	it('blocks deleting a course that still has modules', async () => {
		deleteCourseIfEmptyMock.mockRejectedValue(
			new Error('This course still has modules. Archive it, or delete empty modules first.')
		);

		const formData = new FormData();
		formData.set('courseId', 'course_qa');

		const result = await actions.deleteCourse({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: { error: expect.stringContaining('still has modules') }
		});
	});

	it('deletes an empty course', async () => {
		deleteCourseIfEmptyMock.mockResolvedValue(undefined);

		const formData = new FormData();
		formData.set('courseId', 'course_empty');

		const result = await actions.deleteCourse({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: { KV: { kind: 'kv' } } }
		} as never);

		expect(deleteCourseIfEmptyMock).toHaveBeenCalledWith({ kind: 'db' }, 'course_empty');
		expect(bumpCatalogCacheVersionMock).toHaveBeenCalled();
		expect(result).toMatchObject({ success: 'Empty course deleted.' });
	});

	it('blocks deleting a module that still has episodes', async () => {
		deleteCourseModuleIfEmptyMock.mockRejectedValue(
			new Error(
				'This module still has episodes. Discard failed uploads or archive the module instead.'
			)
		);

		const formData = new FormData();
		formData.set('moduleId', 'module_probe');

		const result = await actions.deleteModule({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: { error: expect.stringContaining('still has episodes') }
		});
	});

	it('deletes an empty module', async () => {
		deleteCourseModuleIfEmptyMock.mockResolvedValue(undefined);

		const formData = new FormData();
		formData.set('moduleId', 'module_empty');

		const result = await actions.deleteModule({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: { KV: { kind: 'kv' } } }
		} as never);

		expect(deleteCourseModuleIfEmptyMock).toHaveBeenCalledWith({ kind: 'db' }, 'module_empty');
		expect(result).toMatchObject({ success: 'Empty module deleted.' });
	});

	it('returns a meaningful confirmation after creating an event', async () => {
		const formData = new FormData();
		formData.set('title', 'Quarterly member briefing');
		formData.set('description', 'Live briefing for members.');
		formData.set('status', 'scheduled');
		formData.set('startsAt', '2026-08-12T09:30');
		formData.set('endsAt', '2026-08-12T10:30');
		formData.set('startsAtEpoch', String(Date.parse('2026-08-12T07:30:00.000Z')));
		formData.set('endsAtEpoch', String(Date.parse('2026-08-12T08:30:00.000Z')));

		const result = await actions.createEvent({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(createEventMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({
				title: 'Quarterly member briefing',
				status: 'scheduled',
				startsAt: Date.parse('2026-08-12T07:30:00.000Z'),
				endsAt: Date.parse('2026-08-12T08:30:00.000Z')
			})
		);
		expect(result).toEqual({
			success: '"Quarterly member briefing" created with Scheduled status.'
		});
	});

	it('returns import errors with local form context and preserved pasted CSV', async () => {
		const formData = new FormData();
		formData.set('csvData', 'email,name,tier\nnot-an-email,Member,bronze');

		const result = await actions.importMembers({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				action: 'importMembers',
				error: expect.stringContaining('email'),
				values: {
					csvData: expect.stringContaining('not-an-email'),
					sendOnboardingEmail: false
				}
			}
		});
	});

	it('blocks bulk onboarding re-nudges without explicit confirmation', async () => {
		const result = await actions.nudgeAwaitingSignups({
			request: { formData: async () => new FormData() },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(nudgeAwaitingSignupImportsMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			status: 400,
			data: { error: expect.stringContaining('confirm') }
		});
	});

	it('sends bulk onboarding re-nudges after explicit confirmation', async () => {
		nudgeAwaitingSignupImportsMock.mockResolvedValue({
			sent: 3,
			skippedCooldown: 2,
			skippedInactive: 1,
			failures: []
		});
		const formData = new FormData();
		formData.set('confirmBulkNudge', 'confirm');

		const result = await actions.nudgeAwaitingSignups({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(nudgeAwaitingSignupImportsMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ RESEND_API_KEY: 'test' })
		);
		expect(result).toMatchObject({
			success: expect.stringContaining('Sent 3')
		});
	});
});
