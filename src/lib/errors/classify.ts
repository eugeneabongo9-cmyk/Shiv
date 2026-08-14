// Map an unknown thrown value + HTTP status into our taxonomy.
// Ledger entry: 2026-05-26 · INV-005 · Error boundaries.

import { ERROR_CODES, type ErrorCode } from './codes';

const UPSTREAM_SCOPES = ['woocommerce', 'wc', 'clerk', 'resend', 'stream', 'cloudflare'];

export function classify(error: unknown, status?: number): ErrorCode {
	// Status code is the most reliable signal — SvelteKit's error() helper
	// sets it explicitly, as do our guards.
	if (status === 401) return ERROR_CODES.AUTH_REQUIRED;
	if (status === 402) return ERROR_CODES.PAYMENT_REQUIRED;
	if (status === 403) return ERROR_CODES.AUTH_FORBIDDEN;
	if (status === 404) return ERROR_CODES.NOT_FOUND;
	if (status === 400 || status === 422) return ERROR_CODES.INVALID_INPUT;
	if (status === 429) return ERROR_CODES.RATE_LIMITED;
	if (status === 502 || status === 503 || status === 504) {
		return ERROR_CODES.UPSTREAM_FAILURE;
	}

	// Fall back to message-string sniffing for unexpected throws.
	const message =
		error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();

	if (message.includes('not found')) return ERROR_CODES.NOT_FOUND;
	if (message.includes('rate limit') || message.includes('too many'))
		return ERROR_CODES.RATE_LIMITED;
	if (message.includes('unauthorized') || message.includes('unauthenticated'))
		return ERROR_CODES.AUTH_REQUIRED;
	if (message.includes('forbidden')) return ERROR_CODES.AUTH_FORBIDDEN;

	if (UPSTREAM_SCOPES.some((scope) => message.includes(scope))) {
		return ERROR_CODES.UPSTREAM_FAILURE;
	}

	return ERROR_CODES.INTERNAL_ERROR;
}

// Reverse mapping for boundary copy — human strings keyed by code.
export const ERROR_HEADLINES: Record<ErrorCode, string> = {
	AUTH_REQUIRED: 'Please sign in',
	AUTH_FORBIDDEN: "You don't have access to this",
	NOT_FOUND: "We couldn't find that",
	INVALID_INPUT: 'Something in that request was off',
	RATE_LIMITED: 'Slow down a moment',
	PAYMENT_REQUIRED: 'This is a paid-member feature',
	UPSTREAM_FAILURE: 'A connected service is down',
	INTERNAL_ERROR: 'Something went wrong on our end',
	CLIENT_ERROR: 'Something went wrong in your browser'
};
