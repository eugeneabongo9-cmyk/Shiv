import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	checkStreamVideoExists,
	getPlaybackTokenTtlSeconds,
	getStreamConfigStatus,
	isSupportedVideoFile,
	parseStreamUidFromReference,
	verifyStreamWebhookSignature
} from './stream';

afterEach(() => {
	vi.useRealTimers();
});

describe('parseStreamUidFromReference', () => {
	const uid = 'a1b2c3d4e5f6789012345678abcdef01';

	it('accepts a raw Stream UID', () => {
		expect(parseStreamUidFromReference(uid)).toBe(uid);
	});

	it('parses videodelivery.net URLs', () => {
		expect(
			parseStreamUidFromReference(`https://videodelivery.net/${uid}/manifest/video.m3u8`)
		).toBe(uid);
	});

	it('parses Cloudflare Stream watch URLs', () => {
		expect(
			parseStreamUidFromReference(`https://customer-abc123.cloudflarestream.com/${uid}/watch`)
		).toBe(uid);
	});

	it('parses iframe embed URLs', () => {
		expect(parseStreamUidFromReference(`https://iframe.cloudflarestream.com/${uid}`)).toBe(uid);
	});

	it('returns null for invalid values', () => {
		expect(parseStreamUidFromReference('')).toBeNull();
		expect(parseStreamUidFromReference('not-a-stream-id')).toBeNull();
	});
});

describe('getPlaybackTokenTtlSeconds', () => {
	it('defaults to four hours for long-course playback', () => {
		expect(getPlaybackTokenTtlSeconds({})).toBe(14_400);
	});

	it('honors a valid VIDEO_STREAM_TOKEN_TTL_SECONDS override', () => {
		expect(getPlaybackTokenTtlSeconds({ VIDEO_STREAM_TOKEN_TTL_SECONDS: '3600' })).toBe(3600);
	});

	it('clamps values below the minimum to 15 minutes', () => {
		expect(getPlaybackTokenTtlSeconds({ VIDEO_STREAM_TOKEN_TTL_SECONDS: '60' })).toBe(900);
	});

	it('clamps values above Cloudflare max to 24 hours', () => {
		expect(getPlaybackTokenTtlSeconds({ VIDEO_STREAM_TOKEN_TTL_SECONDS: '999999' })).toBe(86_400);
	});

	it('falls back to the default for invalid env values', () => {
		expect(getPlaybackTokenTtlSeconds({ VIDEO_STREAM_TOKEN_TTL_SECONDS: 'not-a-number' })).toBe(
			14_400
		);
		expect(getPlaybackTokenTtlSeconds({ VIDEO_STREAM_TOKEN_TTL_SECONDS: '-10' })).toBe(14_400);
	});
});

describe('getStreamConfigStatus', () => {
	it('reports ready when all required keys are present', () => {
		expect(
			getStreamConfigStatus({
				CLOUDFLARE_ACCOUNT_ID: 'account_1',
				CLOUDFLARE_STREAM_API_TOKEN: 'token_1',
				CLOUDFLARE_STREAM_WEBHOOK_SECRET: 'secret_1'
			})
		).toEqual({ ready: true, missingKeys: [] });
	});

	it('lists every missing key so admins and tests can see exactly what to configure', () => {
		expect(getStreamConfigStatus({})).toEqual({
			ready: false,
			missingKeys: [
				'CLOUDFLARE_ACCOUNT_ID',
				'CLOUDFLARE_STREAM_API_TOKEN',
				'CLOUDFLARE_STREAM_WEBHOOK_SECRET'
			]
		});
	});

	it('accepts alternate account id and token env var names', () => {
		expect(
			getStreamConfigStatus({
				CF_ACCOUNT_ID: 'account_1',
				STREAM_API_TOKEN: 'token_1',
				CLOUDFLARE_STREAM_WEBHOOK_SECRET: 'secret_1'
			})
		).toEqual({ ready: true, missingKeys: [] });
	});
});

describe('isSupportedVideoFile', () => {
	it('accepts any declared video/* MIME type', () => {
		expect(isSupportedVideoFile({ fileName: 'clip.bin', fileType: 'video/mp4' })).toBe(true);
	});

	it('accepts a known video file extension when the MIME type is missing', () => {
		expect(isSupportedVideoFile({ fileName: 'clip.mkv', fileType: '' })).toBe(true);
		expect(isSupportedVideoFile({ fileName: 'clip.MOV', fileType: undefined })).toBe(true);
	});

	it('rejects non-video files', () => {
		expect(isSupportedVideoFile({ fileName: 'notes.txt', fileType: 'text/plain' })).toBe(false);
		expect(isSupportedVideoFile({ fileName: 'image.png', fileType: 'image/png' })).toBe(false);
		expect(isSupportedVideoFile({ fileName: null, fileType: null })).toBe(false);
	});
});

describe('verifyStreamWebhookSignature', () => {
	it('accepts a fresh Cloudflare HMAC and rejects a modified body', async () => {
		const now = Date.UTC(2026, 7, 11, 18, 0, 0);
		const timestamp = Math.floor(now / 1000);
		const secret = 'stream-webhook-test-secret';
		const body = '{"uid":"a1b2c3d4e5f6789012345678abcdef01","readyToStream":true}';
		const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
		vi.useFakeTimers();
		vi.setSystemTime(now);

		expect(
			await verifyStreamWebhookSignature(`time=${timestamp},sig1=${signature}`, body, secret)
		).toBe(true);
		expect(
			await verifyStreamWebhookSignature(`time=${timestamp},sig1=${signature}`, `${body} `, secret)
		).toBe(false);
	});

	it('rejects signatures outside the replay window', async () => {
		const now = Date.UTC(2026, 7, 11, 18, 0, 0);
		const timestamp = Math.floor(now / 1000) - 301;
		const body = '{}';
		const secret = 'stream-webhook-test-secret';
		const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
		vi.useFakeTimers();
		vi.setSystemTime(now);

		expect(
			await verifyStreamWebhookSignature(`time=${timestamp},sig1=${signature}`, body, secret)
		).toBe(false);
	});
});

describe('checkStreamVideoExists', () => {
	const uid = 'a1b2c3d4e5f6789012345678abcdef01';
	const env = {
		CLOUDFLARE_ACCOUNT_ID: 'acct',
		CLOUDFLARE_STREAM_API_TOKEN: 'token'
	};

	function stubFetch(status: number, body: unknown) {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify(body), { status }))
		);
	}

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reports a real video as existing', async () => {
		stubFetch(200, { success: true, result: { uid, readyToStream: true, duration: 42 } });
		const result = await checkStreamVideoExists(env, uid);
		expect(result.exists).toBe(true);
		if (result.exists === true) {
			expect(result.details.readyToStream).toBe(true);
		}
	});

	// The bug this guards: a UID Cloudflare has never heard of was previously
	// swallowed and reported as "still processing", so a lesson was created
	// pointing at a video that would never exist.
	it('reports a definitive absence for a 404', async () => {
		stubFetch(404, { success: false, errors: [{ code: 10005, message: 'not found' }] });
		expect((await checkStreamVideoExists(env, uid)).exists).toBe(false);
	});

	it('treats a Cloudflare outage as unknown, not as absence', async () => {
		stubFetch(500, { success: false, errors: [{ code: 10000, message: 'server error' }] });
		expect((await checkStreamVideoExists(env, uid)).exists).toBe('unknown');
	});

	it('treats a network failure as unknown', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('ECONNREFUSED');
			})
		);
		expect((await checkStreamVideoExists(env, uid)).exists).toBe('unknown');
	});

	it('treats missing Stream configuration as unknown rather than absence', async () => {
		stubFetch(200, { success: true, result: {} });
		expect((await checkStreamVideoExists({}, uid)).exists).toBe('unknown');
	});
});
