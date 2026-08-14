// Error code taxonomy — single source of truth for typed error responses.
// Ledger entry: 2026-05-26 · INV-005 · Error boundaries.
//
// Every server-side error path classifies into one of these codes. The string
// values are stable contracts — API consumers and analytics dashboards key off
// them, so renaming is a breaking change.

export const ERROR_CODES = {
	AUTH_REQUIRED: 'AUTH_REQUIRED',
	AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
	NOT_FOUND: 'NOT_FOUND',
	INVALID_INPUT: 'INVALID_INPUT',
	RATE_LIMITED: 'RATE_LIMITED',
	PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
	UPSTREAM_FAILURE: 'UPSTREAM_FAILURE',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	CLIENT_ERROR: 'CLIENT_ERROR'
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// The shape that flows through $page.error in +error.svelte. Augments
// the SvelteKit default { message: string } with our taxonomy + Sentry id.
export type AppError = {
	message: string;
	code?: ErrorCode;
	eventId?: string;
};
