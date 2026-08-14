import { createClerkClient, type ClerkClient, type User } from '@clerk/backend';
import { verifyWebhook } from '@clerk/backend/webhooks';
import { CLERK_HANDSHAKE_HEADER, CLERK_HANDSHAKE_VALUE } from '$lib/constants/clerk-handshake';

export interface ClerkRuntimeEnv extends Record<string, string | undefined> {
	ENVIRONMENT?: string;
	NODE_ENV?: string;
	PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
	CLERK_SECRET_KEY?: string;
	CLERK_JWT_KEY?: string;
	CLERK_WEBHOOK_SIGNING_SECRET?: string;
	CLERK_AUTHORIZED_PARTIES?: string;
	PUBLIC_SITE_URL?: string;
}

/** True when the Worker/Pages runtime is the production deployment (wrangler ENVIRONMENT). */
export function isClerkProductionRuntime(env: ClerkRuntimeEnv): boolean {
	return env.ENVIRONMENT === 'production';
}

/**
 * Blocks accidental dev-instance keys on the production Worker. CI and local dev
 * use ENVIRONMENT !== 'production' or dummy keys outside this path.
 */
export function assertClerkKeysForRuntime(env: ClerkRuntimeEnv): void {
	const pk = env.PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
	const sk = env.CLERK_SECRET_KEY ?? '';

	if (pk && sk) {
		const pkIsTest = pk.startsWith('pk_test_');
		const skIsTest = sk.startsWith('sk_test_');
		const pkIsLive = pk.startsWith('pk_live_');
		const skIsLive = sk.startsWith('sk_live_');

		if ((pkIsTest && skIsLive) || (pkIsLive && skIsTest)) {
			throw new Error('Clerk publishable and secret keys must be from the same Clerk instance');
		}
	}

	if (!isClerkProductionRuntime(env)) return;

	if (!pk || !sk) {
		throw new Error(
			'Clerk production runtime requires PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in Cloudflare Pages'
		);
	}

	if (pk.startsWith('pk_test_') || sk.startsWith('sk_test_')) {
		throw new Error(
			'Clerk dev keys (pk_test_/sk_test_) cannot run when ENVIRONMENT=production — use pk_live_/sk_live_ from the production Clerk instance'
		);
	}

	if (!env.CLERK_WEBHOOK_SIGNING_SECRET) {
		throw new Error(
			'CLERK_WEBHOOK_SIGNING_SECRET is required when ENVIRONMENT=production (rotate in Clerk → Webhooks → production endpoint)'
		);
	}
}

export function getClerkClient(env: ClerkRuntimeEnv): ClerkClient {
	assertClerkKeysForRuntime(env);

	if (!env.CLERK_SECRET_KEY) {
		throw new Error('CLERK_SECRET_KEY is not configured');
	}

	return createClerkClient({
		secretKey: env.CLERK_SECRET_KEY,
		publishableKey: env.PUBLIC_CLERK_PUBLISHABLE_KEY
	});
}

function normalizeJwtKey(value: string | undefined): string | undefined {
	if (!value) return undefined;
	return value.replace(/\\n/g, '\n');
}

function normalizeAuthorizedParty(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return '';

	try {
		return new URL(trimmed).origin;
	} catch {
		return trimmed.replace(/\/+$/, '');
	}
}

/** Include www / apex pairs so Clerk JWTs validate regardless of which host the user opened. */
export function expandAuthorizedPartyVariants(origin: string): string[] {
	if (!origin) return [];

	try {
		const url = new URL(origin);
		const variants = new Set<string>([url.origin]);

		if (url.hostname.startsWith('www.')) {
			variants.add(`${url.protocol}//${url.hostname.slice(4)}`);
		} else if (!url.hostname.includes('localhost') && url.hostname.includes('.')) {
			variants.add(`${url.protocol}//www.${url.hostname}`);
		}

		return [...variants];
	} catch {
		return [origin];
	}
}

export function resolveAuthorizedParties(env: ClerkRuntimeEnv): string[] | undefined {
	const configured =
		env.CLERK_AUTHORIZED_PARTIES?.split(',').map(normalizeAuthorizedParty).filter(Boolean) ?? [];
	const canonical = env.PUBLIC_SITE_URL
		? [normalizeAuthorizedParty(env.PUBLIC_SITE_URL)].filter(Boolean)
		: [];
	const origins = Array.from(
		new Set([...canonical, ...configured].flatMap(expandAuthorizedPartyVariants))
	);

	return origins.length > 0 ? origins : undefined;
}

export function appendClerkSetCookies(target: Headers, clerkHeaders: Headers): void {
	const setCookie =
		typeof clerkHeaders.getSetCookie === 'function'
			? clerkHeaders.getSetCookie()
			: clerkHeaders.get('set-cookie')
				? [clerkHeaders.get('set-cookie') as string]
				: [];

	for (const cookie of setCookie) {
		target.append('set-cookie', cookie);
	}
}

/**
 * SvelteKit client navigations load data via fetch(). A Clerk handshake redirect
 * cannot complete inside that fetch, so data requests get a 401 the client turns
 * into a full-page navigation instead.
 */
export function buildClerkHandshakeResponse(
	clerkHeaders: Headers,
	options: { isDataRequest: boolean }
): Response {
	if (options.isDataRequest) {
		const headers = new Headers();
		headers.set(CLERK_HANDSHAKE_HEADER, CLERK_HANDSHAKE_VALUE);
		const location = clerkHeaders.get('location');
		if (location) {
			headers.set('location', location);
		}
		appendClerkSetCookies(headers, clerkHeaders);
		return new Response(null, { status: 401, headers });
	}

	return new Response(null, { status: 307, headers: clerkHeaders });
}

export interface ClerkAuthResult {
	auth: App.Locals['auth'];
	/**
	 * Clerk's `status === 'handshake'`. When true, the server MUST return a
	 * redirect built from `headers` (Location + Set-Cookie) and NOT treat the
	 * request as signed-out — otherwise the browser bounces to /login while
	 * Clerk re-attempts the handshake, producing an infinite login loop.
	 */
	isHandshake: boolean;
	/**
	 * Headers Clerk wants applied to the response: the handshake redirect
	 * (Location + Set-Cookie) on handshake, or refreshed-session Set-Cookie
	 * headers on a normal signed-in request. Null when there is nothing to apply.
	 */
	headers: Headers | null;
}

const EMPTY_AUTH: App.Locals['auth'] = {
	userId: null,
	sessionId: null,
	isAuthenticated: false
};

export async function authenticateClerkRequest(
	request: Request,
	env: ClerkRuntimeEnv
): Promise<ClerkAuthResult> {
	if (!env.CLERK_SECRET_KEY) {
		return { auth: EMPTY_AUTH, isHandshake: false, headers: null };
	}

	try {
		const clerkClient = getClerkClient(env);
		const requestState = await clerkClient.authenticateRequest(request, {
			jwtKey: normalizeJwtKey(env.CLERK_JWT_KEY),
			authorizedParties: resolveAuthorizedParties(env)
		});

		// Handshake: Clerk needs to redirect through its interstitial to (re)issue
		// the session cookie. Honor the Location it provides instead of rendering
		// the request as signed-out (the login-loop fix).
		if (requestState.status === 'handshake' && requestState.headers.get('location')) {
			return { auth: EMPTY_AUTH, isHandshake: true, headers: requestState.headers };
		}

		const auth = requestState.toAuth();
		const userId = auth?.userId ?? null;
		const sessionId = auth?.sessionId ?? null;

		// On a normal request Clerk may hand back a refreshed session token as a
		// Set-Cookie; forward it so the browser stays signed in without re-handshaking.
		const hasHeaders = requestState.headers && [...requestState.headers.keys()].length > 0;

		return {
			auth: {
				userId,
				sessionId,
				isAuthenticated: Boolean(userId)
			},
			isHandshake: false,
			headers: hasHeaders ? requestState.headers : null
		};
	} catch (error) {
		console.error('Clerk auth failed', error);
		return { auth: EMPTY_AUTH, isHandshake: false, headers: null };
	}
}

export async function verifyClerkWebhook(request: Request, env: ClerkRuntimeEnv) {
	assertClerkKeysForRuntime(env);

	if (!env.CLERK_WEBHOOK_SIGNING_SECRET) {
		throw new Error('CLERK_WEBHOOK_SIGNING_SECRET is not configured');
	}

	return verifyWebhook(request, {
		signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET
	});
}

export function getPrimaryEmail(user: User): string {
	const primaryId = user.primaryEmailAddressId;
	return (
		user.emailAddresses.find((entry) => entry.id === primaryId)?.emailAddress ||
		user.emailAddresses[0]?.emailAddress ||
		''
	);
}

export function getDisplayName(user: User): string {
	const first = user.firstName?.trim();
	const last = user.lastName?.trim();
	const full = [first, last].filter(Boolean).join(' ').trim();
	return full || getPrimaryEmail(user) || 'Member';
}

export function isUserEmailVerified(user: User): boolean {
	const primaryId = user.primaryEmailAddressId;
	const primary =
		user.emailAddresses.find((entry) => entry.id === primaryId) || user.emailAddresses[0];
	return primary?.verification?.status === 'verified';
}
