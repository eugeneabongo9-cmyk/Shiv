// L2 cache — `Cache-Control` helpers for SvelteKit `setHeaders`.
//
// The discipline:
//   - Public, read-mostly, identical for everyone -> setPublicCache (long TTL)
//   - User-agnostic at the URL but the response varies by auth state ->
//     setAnonOnlyCache (cached for anonymous visitors only; authenticated
//     requests bypass cache so the user-specific render is never served from
//     edge to a different user).
//   - Per-user content -> setNoStore (or just don't call anything; SvelteKit
//     defaults to no edge cache on dynamic responses).
//
// These helpers also stamp `Vary: Cookie` on the cached-for-anon variant so
// any CDN that does cache by-default also keys on the cookie header (i.e. a
// Clerk session cookie would split the cache key, preventing the same edge
// object from being served to both anon and authed visitors).
//
// Ledger entry: 2026-05-29 · w449 · INV-LAUNCH-001 line 2.1 · L2 cache pass.

import type { SetHeaders } from './_set-headers-type';

type SetHeadersFn = (headers: Record<string, string>) => void;

interface AuthShape {
	user?: unknown;
	auth?: { isAuthenticated?: boolean };
}

/**
 * Fully public, identical-for-everyone responses. Cache aggressively.
 * Use for /sitemap.xml, static feeds, public-only API counters.
 */
export function setPublicCache(setHeaders: SetHeadersFn, maxAgeSeconds: number): void {
	setHeaders({
		'cache-control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`,
		vary: 'Accept-Encoding'
	});
}

/**
 * Cache the response for anonymous visitors only. Authenticated requests get
 * a `private, no-cache` response so their user-specific render never leaks to
 * another user via shared edge cache.
 *
 * Pass `locals` from the SvelteKit event. The function inspects
 * `locals.user`/`locals.auth.isAuthenticated` to decide.
 */
export function setAnonOnlyCache(
	setHeaders: SetHeadersFn,
	locals: AuthShape,
	maxAgeSeconds: number
): void {
	const authenticated = !!locals.user || !!locals.auth?.isAuthenticated;
	if (authenticated) {
		setHeaders({ 'cache-control': 'private, no-cache, no-store, must-revalidate' });
		return;
	}
	setHeaders({
		'cache-control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`,
		// Split the cache key on the Cookie header so a future authed request
		// can't collide with this anon-cached object.
		vary: 'Cookie, Accept-Encoding'
	});
}

/**
 * Per-user dynamic content. Belt-and-braces: tells every cache layer between
 * us and the user not to store anything. Use sparingly — by default SvelteKit
 * server responses are already uncached at the edge; this helper exists for
 * routes where a CDN in front of us might be more eager.
 */
export function setNoStore(setHeaders: SetHeadersFn): void {
	setHeaders({ 'cache-control': 'private, no-cache, no-store, must-revalidate' });
}

// Default TTLs documented in one place so cache audits are easy.
export const CACHE_TTL = {
	/** sitemap, RSS, robots — rarely changes */
	LONG: 3600, // 1 hour
	/** landing copy, marketing fragments — frequent enough to need a short window */
	MEDIUM: 300, // 5 min
	/** tracker count, near-real-time public counters */
	SHORT: 60 // 1 min
} as const;

export type { SetHeaders };
