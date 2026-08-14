/**
 * WooCommerce webhook HMAC-SHA256 signature verification.
 *
 * WooCommerce computes: base64( HMAC-SHA256( raw_body, secret ) )
 * Header: X-WC-Webhook-Signature (case-insensitive in Fetch API)
 */

export const WC_WEBHOOK_SIGNATURE_HEADER = 'x-wc-webhook-signature';
export const WC_WEBHOOK_HMAC_SHA256_BYTES = 32;

export type WcSignatureFailureReason =
	| 'missing_header'
	| 'empty_secret'
	| 'malformed_signature'
	| 'invalid_signature';

export type WcSignatureVerificationResult =
	| { ok: true }
	| { ok: false; reason: WcSignatureFailureReason };

const BASE64_SIGNATURE_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export function normalizeWcWebhookSignatureHeader(
	signature: string | null | undefined
): string | null {
	if (signature == null) return null;
	const trimmed = signature.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export async function computeWcWebhookHmacDigest(
	rawBody: string,
	secret: string
): Promise<Uint8Array> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
	return new Uint8Array(sig);
}

export function encodeDigestBase64(digest: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < digest.byteLength; i++) {
		binary += String.fromCharCode(digest[i]);
	}
	return btoa(binary);
}

export async function computeWcWebhookSignatureBase64(
	rawBody: string,
	secret: string
): Promise<string> {
	const digest = await computeWcWebhookHmacDigest(rawBody, secret);
	return encodeDigestBase64(digest);
}

/**
 * Strict base64 decode for WC webhook signatures.
 * Returns null for malformed input or decoded length !== 32 bytes.
 */
export function decodeWcWebhookSignatureBase64(signature: string): Uint8Array | null {
	const trimmed = signature.trim();
	if (!trimmed || !BASE64_SIGNATURE_RE.test(trimmed)) {
		return null;
	}

	try {
		const binary = atob(trimmed);
		if (binary.length !== WC_WEBHOOK_HMAC_SHA256_BYTES) {
			return null;
		}
		const bytes = new Uint8Array(WC_WEBHOOK_HMAC_SHA256_BYTES);
		for (let i = 0; i < WC_WEBHOOK_HMAC_SHA256_BYTES; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	} catch {
		return null;
	}
}

/**
 * Constant-time comparison for fixed-length HMAC digests.
 * When `actual` is null or wrong length, still scans all bytes of `expected`.
 */
export function timingSafeEqualDigest(expected: Uint8Array, actual: Uint8Array | null): boolean {
	if (expected.length !== WC_WEBHOOK_HMAC_SHA256_BYTES) {
		throw new Error('expected digest must be 32 bytes');
	}

	const comparison = new Uint8Array(WC_WEBHOOK_HMAC_SHA256_BYTES);
	const lengthMatches = actual?.length === WC_WEBHOOK_HMAC_SHA256_BYTES;

	if (lengthMatches && actual) {
		comparison.set(actual);
	}

	let diff = lengthMatches ? 0 : 1;
	for (let i = 0; i < WC_WEBHOOK_HMAC_SHA256_BYTES; i++) {
		diff |= expected[i] ^ comparison[i];
	}

	return diff === 0;
}

export async function verifyWcSignatureDetailed(
	rawBody: string,
	signatureHeader: string | null | undefined,
	secret: string
): Promise<WcSignatureVerificationResult> {
	if (!secret.trim()) {
		return { ok: false, reason: 'empty_secret' };
	}

	const normalized = normalizeWcWebhookSignatureHeader(signatureHeader);
	if (!normalized) {
		return { ok: false, reason: 'missing_header' };
	}

	// Reject common wrong-algorithm encodings before decode (hex, prefixed schemes).
	if (/^sha256=/i.test(normalized) || /^[0-9a-f]{64}$/i.test(normalized)) {
		return { ok: false, reason: 'malformed_signature' };
	}

	const provided = decodeWcWebhookSignatureBase64(normalized);
	if (!provided) {
		return { ok: false, reason: 'malformed_signature' };
	}

	const expected = await computeWcWebhookHmacDigest(rawBody, secret);
	if (!timingSafeEqualDigest(expected, provided)) {
		return { ok: false, reason: 'invalid_signature' };
	}

	return { ok: true };
}

export async function verifyWcSignature(
	rawBody: string,
	signature: string | null | undefined,
	secret: string
): Promise<boolean> {
	const result = await verifyWcSignatureDetailed(rawBody, signature, secret);
	return result.ok;
}

export function readWcWebhookSignatureHeader(headers: Headers): string | null {
	return normalizeWcWebhookSignatureHeader(headers.get(WC_WEBHOOK_SIGNATURE_HEADER));
}
