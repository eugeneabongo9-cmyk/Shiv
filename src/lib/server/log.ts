// Structured error logging — wraps console.error with a label + optional context.
// In production, Sentry's handleErrorWithSentry() in hooks.server.ts captures
// unhandled errors automatically; this helper is for explicitly named error paths
// (webhook handlers, background operations) where you want a consistent label.

export function logError(label: string, error: unknown, context?: Record<string, unknown>): void {
	const msg = error instanceof Error ? error.message : String(error);
	if (context && Object.keys(context).length > 0) {
		console.error(`[${label}]`, msg, context);
	} else {
		console.error(`[${label}]`, msg);
	}
}
