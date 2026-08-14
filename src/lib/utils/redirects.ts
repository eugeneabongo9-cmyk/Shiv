export const DEFAULT_AUTH_REDIRECT = '/dashboard';

export function sanitizeInternalRedirect(
	value: string | null | undefined,
	fallback = DEFAULT_AUTH_REDIRECT
): string {
	if (!value) return fallback;

	const trimmed = value.trim();
	if (!trimmed.startsWith('/')) return fallback;
	if (trimmed.startsWith('//')) return fallback;

	return trimmed;
}

export function buildLoginHref(
	redirectTo: string | null | undefined,
	fallback = DEFAULT_AUTH_REDIRECT
): string {
	const safeRedirect = sanitizeInternalRedirect(redirectTo, fallback);
	return `/login?redirect=${encodeURIComponent(safeRedirect)}`;
}

export function buildSignupHref(
	redirectTo: string | null | undefined,
	fallback = DEFAULT_AUTH_REDIRECT
): string {
	const safeRedirect = sanitizeInternalRedirect(redirectTo, fallback);
	return `/signup?redirect=${encodeURIComponent(safeRedirect)}`;
}
