import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	applyStreamMediaWebhookUpdateMock,
	getDBFromPlatformMock,
	getMediaAssetByIdMock,
	getStreamVideoDetailsMock
} = vi.hoisted(() => ({
	applyStreamMediaWebhookUpdateMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	getMediaAssetByIdMock: vi.fn(),
	getStreamVideoDetailsMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	applyStreamMediaWebhookUpdate: applyStreamMediaWebhookUpdateMock,
	getMediaAssetById: getMediaAssetByIdMock
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: vi.fn(() => ({}))
}));

vi.mock('$lib/server/stream', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/stream')>('$lib/server/stream');
	return {
		...actual,
		getStreamVideoDetails: getStreamVideoDetailsMock
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
	return new Request('https://network.shivworks.com/api/admin/media/uploads/sync', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

const validPayload = { mediaAssetId: 'media_1' };

describe('POST /api/admin/media/uploads/sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		getMediaAssetByIdMock.mockResolvedValue({
			id: 'media_1',
			provider: 'cloudflare_stream',
			providerAssetId: 'stream_uid_1',
			ingestStatus: 'processing'
		});
	});

	it('rejects unauthenticated requests', async () => {
		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: false }, user: null },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(401);
		expect(getStreamVideoDetailsMock).not.toHaveBeenCalled();
	});

	it('rejects non-admin members server-side', async () => {
		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin({ role: 'member' }) },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(403);
		expect(getStreamVideoDetailsMock).not.toHaveBeenCalled();
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
	});

	it('reports a gateway error when Cloudflare cannot be reached', async () => {
		getStreamVideoDetailsMock.mockRejectedValue(new Error('Cloudflare Stream request failed'));

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(502);
		expect(result.error).toBe('Cloudflare Stream request failed');
	});

	it('marks the media asset ready when Cloudflare reports readyToStream', async () => {
		getStreamVideoDetailsMock.mockResolvedValue({
			uid: 'stream_uid_1',
			readyToStream: true,
			status: { state: 'ready' },
			duration: 125.4,
			size: 5_000_000
		});
		applyStreamMediaWebhookUpdateMock.mockResolvedValue({
			id: 'media_1',
			ingestStatus: 'ready',
			durationSeconds: 125,
			sourceBytes: 5_000_000,
			failureReason: null
		});

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(applyStreamMediaWebhookUpdateMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ streamUid: 'stream_uid_1', state: 'ready', durationSeconds: 125 })
		);
		expect(result).toMatchObject({
			success: true,
			data: { mediaAssetId: 'media_1', ingestStatus: 'ready', readyToStream: true }
		});
	});

	it('marks the media asset failed and surfaces the Cloudflare error reason', async () => {
		getStreamVideoDetailsMock.mockResolvedValue({
			uid: 'stream_uid_1',
			readyToStream: false,
			status: { state: 'error', errorReasonText: 'Unsupported codec' }
		});
		applyStreamMediaWebhookUpdateMock.mockResolvedValue({
			id: 'media_1',
			ingestStatus: 'failed',
			durationSeconds: null,
			sourceBytes: null,
			failureReason: 'Unsupported codec'
		});

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(applyStreamMediaWebhookUpdateMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ state: 'failed', failureReason: 'Unsupported codec' })
		);
		expect(result.data.ingestStatus).toBe('failed');
		expect(result.data.failureReason).toBe('Unsupported codec');
	});

	it('keeps the media asset processing while Cloudflare is still transcoding', async () => {
		getStreamVideoDetailsMock.mockResolvedValue({
			uid: 'stream_uid_1',
			readyToStream: false,
			status: { state: 'inprogress' }
		});
		applyStreamMediaWebhookUpdateMock.mockResolvedValue({
			id: 'media_1',
			ingestStatus: 'processing',
			durationSeconds: null,
			sourceBytes: null,
			failureReason: null
		});

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(applyStreamMediaWebhookUpdateMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ state: 'processing' })
		);
		expect(result.data.ingestStatus).toBe('processing');
	});

	it('reports a conflict when the Stream asset is not linked to a media record', async () => {
		getStreamVideoDetailsMock.mockResolvedValue({
			uid: 'stream_uid_1',
			readyToStream: true,
			status: { state: 'ready' }
		});
		applyStreamMediaWebhookUpdateMock.mockResolvedValue(null);

		const response = await POST({
			request: buildRequest(validPayload),
			locals: { auth: { isAuthenticated: true }, user: createAdmin() },
			platform: { env: {} }
		} as never);
		const result = await response.json();

		expect(response.status).toBe(409);
		expect(result.error).toContain('not linked');
	});
});
