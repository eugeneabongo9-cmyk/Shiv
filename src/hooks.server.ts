import { json } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';
import { validateProductionSecrets, isProductionRuntime } from '$lib/server/env-validation';
import { dev } from '$app/environment';
import {
	authenticateClerkRequest,
	appendClerkSetCookies,
	buildClerkHandshakeResponse,
	getClerkClient
} from '$lib/server/clerk';
import { isPaidMemberTier } from '$lib/constants/tiers';
import { ensureMemberIdentity, getMemberByClerkId } from '$lib/server/db/shivworks';
import { enforceSessionSecurity } from '$lib/server/session-security';
import { getOrSet } from '$lib/server/kv-cache';
import { sanitizeInternalRedirect } from '$lib/utils/redirects';
import { buildContentSecurityPolicy } from '$lib/server/csp';

// LAUNCH HOTFIX 2026-06-01: gate Sentry init + sentryHandle on DSN presence
// AND wrap in try/catch. The previous unconditional Sentry.sentryHandle() call
// was crashing the Worker at module load on Cloudflare Pages because
// @sentry/sveltekit relies on Node APIs that don't exist in the Workers
// runtime. Without this guard, every request returned 500/1101 ("TypeError:
// (void 0) is not a function") before any route handler could run.
//
// Lazy init: CF Pages injects SENTRY_DSN via platform.env at request time,
// not process.env at module load — defer init until the first request.
const noopHandle: Handle = async ({ event, resolve }) => resolve(event);

const fallbackHandleError: HandleServerError = ({ error, event }) => {
	const route = event.route?.id ?? 'unknown';
	console.error('[handleError]', route, error);
	return { message: error instanceof Error ? error.message : 'Internal Error' };
};

type SentryRuntime = {
	enabled: boolean;
	handle: Handle;
	handleError: HandleServerError;
};

let sentryRuntime: SentryRuntime = {
	enabled: false,
	handle: noopHandle,
	handleError: fallbackHandleError
};
let sentryInitAttempted = false;

function ensureSentry(runtimeEnv: Record<string, string | undefined>): void {
	if (sentryInitAttempted) {
		return;
	}
	sentryInitAttempted = true;

	const dsn = runtimeEnv.SENTRY_DSN;
	if (!dsn) {
		return;
	}

	const isProduction =
		runtimeEnv.ENVIRONMENT === 'production' || runtimeEnv.NODE_ENV === 'production';

	try {
		Sentry.init({
			dsn,
			tracesSampleRate: isProduction ? 0.2 : 1.0,
			environment: runtimeEnv.ENVIRONMENT ?? runtimeEnv.NODE_ENV ?? 'development'
		});

		const handleFn = Sentry.sentryHandle?.();
		const errorFn = Sentry.handleErrorWithSentry?.();
		sentryRuntime = {
			enabled: true,
			handle: typeof handleFn === 'function' ? handleFn : noopHandle,
			handleError: typeof errorFn === 'function' ? errorFn : fallbackHandleError
		};
	} catch (err) {
		console.error('[hooks] Sentry.init failed; running without Sentry', err);
	}
}

let productionEnvChecked = false;
let productionEnvBlocked = false;
let productionEnvIssues: string[] = [];

function ensureProductionEnv(runtimeEnv: Record<string, string | undefined>): void {
	if (productionEnvChecked) {
		return;
	}
	productionEnvChecked = true;

	if (!isProductionRuntime(runtimeEnv)) {
		return;
	}

	const result = validateProductionSecrets(runtimeEnv);
	if (!result.ok) {
		productionEnvBlocked = true;
		productionEnvIssues = result.issues;
		console.error('[startup] Production environment validation failed:', result.issues);
	}
}

const handleProductionEnvGuard: Handle = async ({ event, resolve }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(event.platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	ensureProductionEnv(runtimeEnv);

	if (productionEnvBlocked) {
		console.error('[startup] Blocking request — invalid production configuration', {
			issues: productionEnvIssues
		});
		return new Response('Service temporarily unavailable (configuration error)', {
			status: 503,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}

	return resolve(event);
};

const handleSentry: Handle = async ({ event, resolve }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(event.platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	ensureSentry(runtimeEnv);
	return sentryRuntime.handle({ event, resolve });
};

// w427-d: Security response headers applied to every response.
// HSTS is harmless on HTTP (local dev) — browsers only enforce it over HTTPS.
//
// CSP rationale (permissive baseline; tighten as each origin is audited):
//   default-src 'self'           — deny-by-default; everything below opts in.
//   script-src   — 'self' + 'unsafe-inline'/'unsafe-eval' (Svelte hydration +
//                  Clerk runtime) + Clerk JS + Sentry browser SDK +
//                  Cloudflare Stream + Cloudflare Insights.
//   style-src    — 'self' + 'unsafe-inline' (Svelte scoped styles inject inline).
//   img-src      — 'self' + data: + https: (Clerk avatars, Stream thumbnails).
//   font-src     — 'self' + data: + Google Fonts (Aaron's brand uses them).
//   connect-src  — 'self' + Clerk API + Sentry ingest + Cloudflare APIs + WC.
//   frame-src    — Clerk captcha + Cloudflare Stream iframe player.
//   media-src    — 'self' + Cloudflare Stream HLS/DASH delivery.
//   object-src   — 'none' (no Flash/PDF embeds).
//   base-uri     — 'self' (block <base> hijack).
//   frame-ancestors — 'none' (paired with X-Frame-Options: DENY).
//   form-action  — 'self' + WC checkout (the only form post out).
// TODO: drop 'unsafe-inline' and 'unsafe-eval' once we adopt CSP nonces.
// Clerk custom domain (pk_live) — FAPI + Account Portal are served from
// clerk./accounts.theshivworksnetwork.com; allowlisted so clerk-js can load
// and the sign-in widget mounts (without this the form silently never appears).
// TODO: pin Sentry org/project subdomain (https://oXXX.ingest.sentry.io).
// Stape server-side GTM loader origins live in `$lib/server/csp`.

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	const runtimeEnv = resolveRuntimeEnv(
		(event.platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	response.headers.set(
		'Content-Security-Policy',
		buildContentSecurityPolicy(event.url, runtimeEnv)
	);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	return response;
};

const handleApp: Handle = async ({ event, resolve }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(event.platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);

	// LOCAL DEV FIX: wrangler injects ENVIRONMENT=production into the dev runtime,
	// which trips Clerk's prod-key guard (local dev legitimately uses pk_test_/sk_test_).
	// Force dev here so local login works. Production build (dev === false) is untouched.
	if (dev) {
		runtimeEnv.ENVIRONMENT = 'development';
		runtimeEnv.NODE_ENV = 'development';
	}

	event.locals.auth = {
		userId: null,
		sessionId: null,
		isAuthenticated: false
	};
	event.locals.user = null;

	const {
		auth,
		isHandshake,
		headers: clerkHeaders
	} = await authenticateClerkRequest(event.request, runtimeEnv);

	// Clerk handshake: redirect through its interstitial (carrying the Set-Cookie
	// it issued) instead of falling through as signed-out. Without this the auth
	// guards bounce the user to /login on every hop — the login loop.
	if (isHandshake && clerkHeaders) {
		return buildClerkHandshakeResponse(clerkHeaders, {
			isDataRequest: event.isDataRequest
		});
	}

	event.locals.auth = auth;

	if (auth.userId) {
		const db = getDBFromPlatform(event.platform);
		const kv = event.platform?.env?.KV;
		let clerkClient: ReturnType<typeof getClerkClient> | null = null;
		try {
			clerkClient = getClerkClient(runtimeEnv);
		} catch (error) {
			console.error('Clerk client unavailable during hydration', error);
		}

		let member: App.Locals['user'] = null;

		// Always read the member row when Clerk authenticated the request. Relying
		// solely on ensureMemberIdentity() meant a transient Clerk API failure left
		// locals.user null and every guarded route bounced to /login.
		try {
			member = await getMemberByClerkId(db, auth.userId);
		} catch (error) {
			console.error('Direct member read failed', error);
		}

		if (clerkClient) {
			// w450-c: serve the member row from KV on cache hit (TTL 300 s) to avoid
			// a D1 read on every authenticated request. Falls back to D1 on miss or
			// when KV is unavailable (Replit dev). Busted by Clerk + WC webhooks.
			try {
				member =
					(await getOrSet(kv, `member:${auth.userId}`, 300, () =>
						ensureMemberIdentity(
							db,
							clerkClient as NonNullable<typeof clerkClient>,
							auth.userId as string,
							kv
						)
					)) ?? member;
			} catch (error) {
				console.error('Member identity hydration failed; keeping direct read', error);
			}

			// Free-tier cache hits skip the fetcher — re-hydrate so a new WC import can
			// claim immediately. Non-fatal: keep the member we already have on failure.
			if (member && member.role !== 'admin' && !isPaidMemberTier(member.tier)) {
				try {
					member = (await ensureMemberIdentity(db, clerkClient, auth.userId, kv)) ?? member;
				} catch (error) {
					console.error('Free-tier member refresh failed (non-fatal)', error);
				}
			}
		}

		if (auth.userId && !member && clerkClient) {
			try {
				member = await ensureMemberIdentity(db, clerkClient, auth.userId, kv);
			} catch (error) {
				console.error('Final member hydration attempt failed', error);
			}
		}

		event.locals.user = member;

		if (clerkClient && auth.sessionId && member) {
			try {
				const sessionOutcome = await enforceSessionSecurity({
					db,
					clerkClient,
					member,
					sessionId: auth.sessionId,
					request: event.request,
					runtimeEnv
				});

				if (sessionOutcome.status === 'revoked') {
					event.locals.auth = {
						userId: null,
						sessionId: null,
						isAuthenticated: false
					};
					event.locals.user = null;

					if (event.isDataRequest) {
						return json(
							{
								type: 'error',
								error: {
									message: 'This session was revoked. Sign in again to continue.',
									code: 'AUTH_REQUIRED'
								}
							},
							{ status: 401 }
						);
					}

					const redirectPath = sanitizeInternalRedirect(event.url.pathname);
					return new Response(null, {
						status: 302,
						headers: {
							Location: `/login?session=revoked&redirect=${encodeURIComponent(redirectPath)}`
						}
					});
				}
			} catch (error) {
				console.error('Session security enforcement failed (non-fatal)', error);
			}
		}
	}

	const response = await resolve(event);

	// Forward any refreshed-session Set-Cookie Clerk issued so the browser keeps
	// a fresh token and doesn't have to handshake again on the next request.
	if (clerkHeaders) {
		appendClerkSetCookies(response.headers, clerkHeaders);
	}

	return response;
};

export const handle: Handle = sequence(
	handleProductionEnvGuard,
	handleSentry,
	handleSecurityHeaders,
	handleApp
);

export const handleError: HandleServerError = (input) => {
	const runtimeEnv = resolveRuntimeEnv(
		(input.event.platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	ensureSentry(runtimeEnv);
	return sentryRuntime.handleError(input);
};
