import { describe, expect, it } from 'vitest';
import {
	computeWcWebhookSignatureBase64,
	decodeWcWebhookSignatureBase64,
	normalizeWcWebhookSignatureHeader,
	timingSafeEqualDigest,
	verifyWcSignature,
	verifyWcSignatureDetailed,
	WC_WEBHOOK_HMAC_SHA256_BYTES
} from './wc-webhook-signature';

const SECRET = 'a7f3c9e2b1d84f6a0e5c8b2d9f1a4e7c';
const BODY = JSON.stringify({ id: 1, hello: 'world' });

async function sign(body: string, secret: string): Promise<string> {
	return computeWcWebhookSignatureBase64(body, secret);
}

describe('normalizeWcWebhookSignatureHeader', () => {
	it('trims whitespace and rejects empty values', () => {
		expect(normalizeWcWebhookSignatureHeader('  abc  ')).toBe('abc');
		expect(normalizeWcWebhookSignatureHeader('')).toBeNull();
		expect(normalizeWcWebhookSignatureHeader('   ')).toBeNull();
		expect(normalizeWcWebhookSignatureHeader(null)).toBeNull();
		expect(normalizeWcWebhookSignatureHeader(undefined)).toBeNull();
	});
});

describe('decodeWcWebhookSignatureBase64', () => {
	it('decodes a valid WC signature to 32 bytes', async () => {
		const encoded = await sign(BODY, SECRET);
		const decoded = decodeWcWebhookSignatureBase64(encoded);
		expect(decoded).not.toBeNull();
		expect(decoded?.length).toBe(WC_WEBHOOK_HMAC_SHA256_BYTES);
	});

	it('rejects malformed base64', () => {
		expect(decodeWcWebhookSignatureBase64('not!!!valid@@@')).toBeNull();
		expect(decodeWcWebhookSignatureBase64('abc')).toBeNull();
	});

	it('rejects truncated digest length', async () => {
		const encoded = await sign(BODY, SECRET);
		expect(decodeWcWebhookSignatureBase64(encoded.slice(0, -4))).toBeNull();
	});
});

describe('timingSafeEqualDigest', () => {
	it('accepts equal digests', () => {
		const a = new Uint8Array(WC_WEBHOOK_HMAC_SHA256_BYTES).fill(9);
		const b = new Uint8Array(WC_WEBHOOK_HMAC_SHA256_BYTES).fill(9);
		expect(timingSafeEqualDigest(a, b)).toBe(true);
	});

	it('rejects unequal digests of same length', () => {
		const a = new Uint8Array(WC_WEBHOOK_HMAC_SHA256_BYTES).fill(9);
		const b = new Uint8Array(WC_WEBHOOK_HMAC_SHA256_BYTES).fill(8);
		expect(timingSafeEqualDigest(a, b)).toBe(false);
	});

	it('rejects null and wrong-length digests without throwing', () => {
		const expected = new Uint8Array(WC_WEBHOOK_HMAC_SHA256_BYTES).fill(7);
		expect(timingSafeEqualDigest(expected, null)).toBe(false);
		expect(timingSafeEqualDigest(expected, new Uint8Array(8))).toBe(false);
	});
});

describe('verifyWcSignatureDetailed', () => {
	it('accepts a valid signature', async () => {
		const signature = await sign(BODY, SECRET);
		await expect(verifyWcSignatureDetailed(BODY, signature, SECRET)).resolves.toEqual({ ok: true });
	});

	it('rejects an invalid signature', async () => {
		const signature = await sign(BODY, 'different-secret');
		await expect(verifyWcSignatureDetailed(BODY, signature, SECRET)).resolves.toEqual({
			ok: false,
			reason: 'invalid_signature'
		});
	});

	it('rejects a missing header', async () => {
		await expect(verifyWcSignatureDetailed(BODY, null, SECRET)).resolves.toEqual({
			ok: false,
			reason: 'missing_header'
		});
	});

	it('rejects an empty secret', async () => {
		const signature = await sign(BODY, SECRET);
		await expect(verifyWcSignatureDetailed(BODY, signature, '   ')).resolves.toEqual({
			ok: false,
			reason: 'empty_secret'
		});
	});

	it('rejects a tampered body', async () => {
		const signature = await sign(BODY, SECRET);
		await expect(verifyWcSignatureDetailed(`${BODY}tampered`, signature, SECRET)).resolves.toEqual({
			ok: false,
			reason: 'invalid_signature'
		});
	});

	it('rejects truncated signature', async () => {
		const signature = (await sign(BODY, SECRET)).slice(0, -4);
		await expect(verifyWcSignatureDetailed(BODY, signature, SECRET)).resolves.toEqual({
			ok: false,
			reason: 'malformed_signature'
		});
	});

	it('rejects malformed base64 signature', async () => {
		await expect(verifyWcSignatureDetailed(BODY, '%%%not-base64%%%', SECRET)).resolves.toEqual({
			ok: false,
			reason: 'malformed_signature'
		});
	});

	it('rejects hex-encoded digest (wrong algorithm encoding)', async () => {
		const digest = await crypto.subtle.sign(
			'HMAC',
			await crypto.subtle.importKey(
				'raw',
				new TextEncoder().encode(SECRET),
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['sign']
			),
			new TextEncoder().encode(BODY)
		);
		const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
		await expect(verifyWcSignatureDetailed(BODY, hex, SECRET)).resolves.toEqual({
			ok: false,
			reason: 'malformed_signature'
		});
	});

	it('rejects sha256= prefixed signatures', async () => {
		const signature = await sign(BODY, SECRET);
		await expect(verifyWcSignatureDetailed(BODY, `sha256=${signature}`, SECRET)).resolves.toEqual({
			ok: false,
			reason: 'malformed_signature'
		});
	});

	it('accepts signatures with surrounding whitespace', async () => {
		const signature = await sign(BODY, SECRET);
		await expect(verifyWcSignatureDetailed(BODY, `  ${signature}  `, SECRET)).resolves.toEqual({
			ok: true
		});
	});
});

describe('verifyWcSignature replay semantics', () => {
	it('valid signature for body A does not verify body B (cryptographic replay of payload)', async () => {
		const bodyA = JSON.stringify({ id: 1 });
		const bodyB = JSON.stringify({ id: 2 });
		const signature = await sign(bodyA, SECRET);

		expect(await verifyWcSignature(bodyB, signature, SECRET)).toBe(false);
	});

	it('replaying the same valid signature for the same body still verifies (app-layer idempotency required)', async () => {
		const signature = await sign(BODY, SECRET);
		expect(await verifyWcSignature(BODY, signature, SECRET)).toBe(true);
		expect(await verifyWcSignature(BODY, signature, SECRET)).toBe(true);
	});
});

describe('verifyWcSignature boolean wrapper', () => {
	it('returns false for all failure reasons', async () => {
		expect(await verifyWcSignature(BODY, null, SECRET)).toBe(false);
		expect(await verifyWcSignature(BODY, '%%%', SECRET)).toBe(false);
	});
});
