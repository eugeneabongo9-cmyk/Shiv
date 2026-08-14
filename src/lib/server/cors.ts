/**
 * Cross-origin allowlist for public read-only API endpoints.
 * Never use '*' on authenticated or write endpoints.
 */

export const PUBLIC_READ_CORS_ORIGINS = new Set([
	'https://shivworkspg.com',
	'https://www.shivworkspg.com'
]);

export function isAllowedCorsOrigin(origin: string | null): origin is string {
	return Boolean(origin && PUBLIC_READ_CORS_ORIGINS.has(origin));
}

export function corsHeadersForRequest(request: Request): Record<string, string> {
	const origin = request.headers.get('Origin');
	const headers: Record<string, string> = {
		Vary: 'Origin'
	};

	if (isAllowedCorsOrigin(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
		headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
		headers['Access-Control-Allow-Headers'] = 'Content-Type';
		headers['Access-Control-Max-Age'] = '86400';
	}

	return headers;
}

/** Reject browser cross-origin requests that are not on the allowlist. */
export function rejectDisallowedBrowserOrigin(request: Request): Response | null {
	const origin = request.headers.get('Origin');
	if (origin && !isAllowedCorsOrigin(origin)) {
		return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
			status: 403,
			headers: {
				'Content-Type': 'application/json',
				Vary: 'Origin'
			}
		});
	}
	return null;
}
