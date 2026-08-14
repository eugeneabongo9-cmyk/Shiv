import { describe, expect, it } from 'vitest';
import { isCloudflareStreamEmbedUrl } from './stream-sdk';

describe('isCloudflareStreamEmbedUrl', () => {
	it('accepts Cloudflare Stream and videodelivery hosts', () => {
		expect(
			isCloudflareStreamEmbedUrl(
				'https://iframe.cloudflarestream.com/9d41640818371252d2387bd0fc8a3036'
			)
		).toBe(true);
		expect(isCloudflareStreamEmbedUrl('https://customer-abc.cloudflarestream.com/uid/iframe')).toBe(
			true
		);
		expect(isCloudflareStreamEmbedUrl('https://videodelivery.net/uid/manifest/video.m3u8')).toBe(
			true
		);
	});

	it('rejects non-stream hosts and invalid urls', () => {
		expect(isCloudflareStreamEmbedUrl('https://youtube.com/embed/abc')).toBe(false);
		expect(isCloudflareStreamEmbedUrl('not-a-url')).toBe(false);
		expect(isCloudflareStreamEmbedUrl(null)).toBe(false);
	});
});
