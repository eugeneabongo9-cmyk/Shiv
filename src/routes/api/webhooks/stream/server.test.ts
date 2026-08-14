import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	applyStreamMediaWebhookUpdateMock,
	claimWebhookEventMock,
	getDBFromPlatformMock,
	verifyStreamWebhookSignatureMock
} = vi.hoisted(() => ({
	applyStreamMediaWebhookUpdateMock: vi.fn(),
	claimWebhookEventMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	verifyStreamWebhookSignatureMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));
vi.mock('$lib/server/db/shivworks', () => ({
	applyStreamMediaWebhookUpdate: applyStreamMediaWebhookUpdateMock
}));
vi.mock('$lib/server/stream', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/stream')>();
	return {
		...actual,
		verifyStreamWebhookSignature: verifyStreamWebhookSignatureMock
	};
});
vi.mock('$lib/server/webhook-idempotency', () => ({
	claimWebhookEvent: claimWebhookEventMock
}));
vi.mock('$lib/server/log', () => ({
	logError: vi.fn()
}));

import { POST } from './+server';

const uid = 'a1b2c3d4e5f6789012345678abcdef01';
const thumbnail = `https://customer-example.cloudflarestream.com/${uid}/thumbnails/thumbnail.jpg`;

function requestFor(payload: unknown): Request {
	return new Request('https://network.shivworks.com/api/webhooks/stream', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'webhook-signature': 'time=1700000000,sig1=test'
		},
		body: JSON.stringify(payload)
	});
}

function eventFor(payload: unknown) {
	return {
		request: requestFor(payload),
		platform: {
			env: { CLOUDFLARE_STREAM_WEBHOOK_SECRET: 'stream-webhook-secret' }
		}
	} as never;
}

describe('POST /api/webhooks/stream', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		verifyStreamWebhookSignatureMock.mockResolvedValue(true);
		claimWebhookEventMock.mockResolvedValue({ fresh: true });
		applyStreamMediaWebhookUpdateMock.mockResolvedValue({
			id: 'media_1',
			ingestStatus: 'ready'
		});
	});

	it('rejects an invalid signature before touching D1', async () => {
		verifyStreamWebhookSignatureMock.mockResolvedValue(false);

		const response = await POST(eventFor({ uid, readyToStream: true }));

		expect(response.status).toBe(401);
		expect(getDBFromPlatformMock).not.toHaveBeenCalled();
		expect(applyStreamMediaWebhookUpdateMock).not.toHaveBeenCalled();
	});

	it('records ready metadata including the Stream thumbnail', async () => {
		const response = await POST(
			eventFor({
				uid,
				readyToStream: true,
				status: { state: 'ready' },
				duration: 605.4,
				size: 4096,
				thumbnail
			})
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(applyStreamMediaWebhookUpdateMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			{
				streamUid: uid,
				state: 'ready',
				durationSeconds: 605,
				sourceBytes: 4096,
				failureReason: null,
				thumbnailUrl: thumbnail
			}
		);
		expect(body.data).toMatchObject({ mediaAssetId: 'media_1', ingestStatus: 'ready' });
	});

	it('acknowledges replayed events without applying the update twice', async () => {
		claimWebhookEventMock.mockResolvedValue({ fresh: false });

		const response = await POST(eventFor({ uid, status: { state: 'processing' } }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toMatchObject({ success: true, replayed: true, streamUid: uid });
		expect(applyStreamMediaWebhookUpdateMock).not.toHaveBeenCalled();
	});
});
