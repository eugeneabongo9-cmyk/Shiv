import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	getDBFromPlatformMock,
	getMediaAssetByIdMock,
	markMediaUploadCompletedMock,
	updateUploadEpisodeMetadataMock
} = vi.hoisted(() => ({
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	getMediaAssetByIdMock: vi.fn(),
	markMediaUploadCompletedMock: vi.fn(),
	updateUploadEpisodeMetadataMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getMediaAssetById: getMediaAssetByIdMock,
	markMediaUploadCompleted: markMediaUploadCompletedMock,
	updateUploadEpisodeMetadata: updateUploadEpisodeMetadataMock
}));

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
	return new Request('https://network.shivworks.com/api/admin/media/uploads/complete', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

const validPayload = { mediaAssetId: 'media_1' };

describe('POST /api/admin/media/uploads/complete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
	});

	it('rejects unauthenticated requests', async () => {
		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: false }, user: null },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(401);
		expect(getMediaAssetByIdMock).not.toHaveBeenCalled();
	});

	it('rejects non-admin members server-side', async () => {
		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin({ role: 'member' }) },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(403);
		expect(getMediaAssetByIdMock).not.toHaveBeenCalled();
	});

	it('rejects a request for a media asset that does not exist', async () => {
		getMediaAssetByIdMock.mockResolvedValue(null);

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(404);
		expect(result.error).toContain('not found');
	});

	it('rejects a media asset that was never sent to Cloudflare Stream', async () => {
		getMediaAssetByIdMock.mockResolvedValue({
			id: 'media_1',
			provider: 'cloudflare_stream',
			providerAssetId: null,
			ingestStatus: 'pending_upload'
		});

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(409);
		expect(result.error).toContain('Stream UID');
		expect(markMediaUploadCompletedMock).not.toHaveBeenCalled();
	});

	it('rejects finalizing a media asset that already failed', async () => {
		getMediaAssetByIdMock.mockResolvedValue({
			id: 'media_1',
			provider: 'cloudflare_stream',
			providerAssetId: 'stream_uid_1',
			ingestStatus: 'failed',
			failureReason: 'Cloudflare Stream rejected the file'
		});

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(409);
		expect(result.error).toBe('Cloudflare Stream rejected the file');
		expect(markMediaUploadCompletedMock).not.toHaveBeenCalled();
	});

	it('marks a pending upload completed and reports the Stream UID', async () => {
		getMediaAssetByIdMock.mockResolvedValue({
			id: 'media_1',
			provider: 'cloudflare_stream',
			providerAssetId: 'stream_uid_1',
			ingestStatus: 'pending_upload',
			updatedAt: 1_700_000_000
		});
		markMediaUploadCompletedMock.mockResolvedValue({
			id: 'media_1',
			ingestStatus: 'processing',
			updatedAt: 1_700_000_100
		});

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(markMediaUploadCompletedMock).toHaveBeenCalledWith({ kind: 'db' }, 'media_1');
		expect(result).toMatchObject({
			success: true,
			data: {
				mediaAssetId: 'media_1',
				ingestStatus: 'processing',
				streamUid: 'stream_uid_1',
				updatedAt: 1_700_000_100
			}
		});
	});

	it('saves metadata edits made while the file was uploading', async () => {
		getMediaAssetByIdMock.mockResolvedValue({
			id: 'media_1',
			provider: 'cloudflare_stream',
			providerAssetId: 'stream_uid_1',
			ingestStatus: 'pending_upload',
			updatedAt: 1_700_000_000
		});
		markMediaUploadCompletedMock.mockResolvedValue({
			id: 'media_1',
			ingestStatus: 'processing',
			updatedAt: 1_700_000_100
		});

		const response = await POST({
			request: buildRequest({
				mediaAssetId: 'media_1',
				episodeId: 'episode_1',
				title: 'Edited during upload',
				description: 'Final lesson copy',
				accessTier: 'vip'
			}),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(200);
		expect(updateUploadEpisodeMetadataMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			{
				episodeId: 'episode_1',
				title: 'Edited during upload',
				description: 'Final lesson copy',
				accessTier: 'vip'
			}
		);
	});

	it('is idempotent when the asset was already finalized', async () => {
		getMediaAssetByIdMock.mockResolvedValue({
			id: 'media_1',
			provider: 'cloudflare_stream',
			providerAssetId: 'stream_uid_1',
			ingestStatus: 'ready',
			updatedAt: 1_700_000_000
		});

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(markMediaUploadCompletedMock).not.toHaveBeenCalled();
		expect(result.data.ingestStatus).toBe('ready');
	});
});
