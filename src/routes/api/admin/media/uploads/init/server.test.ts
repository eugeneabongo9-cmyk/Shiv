import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	attachStreamUidToMediaAssetMock,
	createEpisodeUploadReservationMock,
	createTusDirectUploadMock,
	getCourseModuleByIdMock,
	getDBFromPlatformMock,
	getStreamConfigStatusMock,
	markMediaUploadFailedMock,
	replaceEpisodeUploadReservationMock
} = vi.hoisted(() => ({
	attachStreamUidToMediaAssetMock: vi.fn(),
	createEpisodeUploadReservationMock: vi.fn(),
	createTusDirectUploadMock: vi.fn(),
	getCourseModuleByIdMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	getStreamConfigStatusMock: vi.fn(() => ({ ready: true, missingKeys: [] as string[] })),
	markMediaUploadFailedMock: vi.fn(),
	replaceEpisodeUploadReservationMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	attachStreamUidToMediaAsset: attachStreamUidToMediaAssetMock,
	createEpisodeUploadReservation: createEpisodeUploadReservationMock,
	getCourseModuleById: getCourseModuleByIdMock,
	markMediaUploadFailed: markMediaUploadFailedMock,
	replaceEpisodeUploadReservation: replaceEpisodeUploadReservationMock
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: vi.fn(() => ({}))
}));

vi.mock('$lib/server/stream', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/stream')>('$lib/server/stream');
	return {
		...actual,
		createTusDirectUpload: createTusDirectUploadMock,
		getStreamConfigStatus: getStreamConfigStatusMock
	};
});

import { POST } from './+server';

function createAdmin(
	overrides: Partial<NonNullable<App.Locals['user']>> = {}
): NonNullable<App.Locals['user']> {
	return {
		clerkUserId: 'admin_1',
		email: 'admin@example.com',
		name: 'Admin',
		tier: 'vip',
		role: 'admin',
		accessStatus: 'active',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

function buildRequest(body: unknown): Request {
	return new Request('https://network.shivworks.com/api/admin/media/uploads/init', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

const validPayload = {
	moduleId: 'module_new_1',
	title: 'Episode one',
	fileName: 'episode-one.mp4',
	fileType: 'video/mp4',
	fileSizeBytes: 1024 * 1024
};

describe('POST /api/admin/media/uploads/init', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		getStreamConfigStatusMock.mockReturnValue({ ready: true, missingKeys: [] });
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_new_1',
			courseId: 'course_new_1',
			title: 'Module 1',
			description: null,
			sortOrder: 1,
			status: 'coming_soon',
			videoKind: 'none',
			videoUrl: null,
			durationLabel: null,
			thumbnailUrl: null,
			publishedAt: null,
			accessTier: 'member',
			courseSlug: 'new-course',
			courseTitle: 'New Course',
			courseAccessTier: 'member'
		});
		createEpisodeUploadReservationMock.mockResolvedValue({
			mediaAsset: { id: 'media_1' },
			episode: { id: 'episode_1', courseId: 'course_new_1' }
		});
		replaceEpisodeUploadReservationMock.mockResolvedValue({
			mediaAsset: { id: 'media_replacement' },
			episode: { id: 'episode_existing', courseId: 'course_new_1' }
		});
		createTusDirectUploadMock.mockResolvedValue({
			streamUid: 'stream_uid_1',
			uploadUrl: 'https://upload.videodelivery.net/stream_uid_1',
			expiresAt: 1_700_000_000
		});
	});

	it('rejects unauthenticated requests', async () => {
		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: false }, user: null },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(401);
		expect(createEpisodeUploadReservationMock).not.toHaveBeenCalled();
	});

	it('rejects non-admin members server-side', async () => {
		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin({ role: 'member' }) },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(403);
		expect(createEpisodeUploadReservationMock).not.toHaveBeenCalled();
	});

	it('rejects the request before creating any record when Stream is not configured', async () => {
		getStreamConfigStatusMock.mockReturnValue({
			ready: false,
			missingKeys: ['CLOUDFLARE_STREAM_API_TOKEN']
		});

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(503);
		expect(result.error).toContain('CLOUDFLARE_STREAM_API_TOKEN');
		expect(createEpisodeUploadReservationMock).not.toHaveBeenCalled();
	});

	it('rejects files that are not a supported video type', async () => {
		const response = await POST({
			request: buildRequest({ ...validPayload, fileName: 'notes.txt', fileType: 'text/plain' }),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.error).toContain('supported video');
		expect(createEpisodeUploadReservationMock).not.toHaveBeenCalled();
	});

	it('rejects uploads targeting a destination that does not exist', async () => {
		getCourseModuleByIdMock.mockResolvedValue(null);

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(404);
		expect(result.error).toContain('destination');
		expect(createEpisodeUploadReservationMock).not.toHaveBeenCalled();
	});

	it('reserves an episode, creates a TUS upload, and attaches the Stream UID', async () => {
		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(createEpisodeUploadReservationMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ moduleId: 'module_new_1', title: 'Episode one' })
		);
		expect(attachStreamUidToMediaAssetMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			'media_1',
			'stream_uid_1'
		);
		expect(result).toMatchObject({
			success: true,
			data: {
				mediaAssetId: 'media_1',
				episodeId: 'episode_1',
				streamUid: 'stream_uid_1',
				ingestStatus: 'pending_upload'
			}
		});
	});

	it('replaces failed media without recreating the lesson', async () => {
		const response = await POST({
			request: buildRequest({ ...validPayload, episodeId: 'episode_existing' }),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(createEpisodeUploadReservationMock).not.toHaveBeenCalled();
		expect(replaceEpisodeUploadReservationMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({
				episodeId: 'episode_existing',
				moduleId: 'module_new_1',
				title: 'Episode one'
			})
		);
		expect(result.data).toMatchObject({
			mediaAssetId: 'media_replacement',
			episodeId: 'episode_existing'
		});
	});

	it('marks the reservation failed and reports an error when Stream initialization fails', async () => {
		createTusDirectUploadMock.mockRejectedValue(new Error('Cloudflare Stream is unavailable'));

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(markMediaUploadFailedMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			'media_1',
			'Cloudflare Stream is unavailable'
		);
		expect(result).toMatchObject({ success: false, error: 'Cloudflare Stream is unavailable' });
	});
});
