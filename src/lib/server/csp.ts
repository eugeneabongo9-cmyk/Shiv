/**
 * Content Security Policy helpers shared by hooks and regression tests.
 */

export const STAPE_GTM_ORIGINS = [
	'https://load.sst.theshivworksnetwork.com',
	'https://sst.theshivworksnetwork.com'
] as const;

const STAPE_GTM_ORIGIN_LIST = STAPE_GTM_ORIGINS.join(' ');
export const META_PIXEL_SCRIPT_ORIGIN = 'https://connect.facebook.net';
export const HYROS_SCRIPT_ORIGIN = 'https://222211.t.hyros.com';

const FRAME_SRC_BASE =
	"'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.theshivworksnetwork.com https://accounts.theshivworksnetwork.com https://challenges.cloudflare.com https://*.cloudflarestream.com https://iframe.cloudflarestream.com https://embed.cloudflarestream.com https://www.youtube.com https://youtube.com https://player.vimeo.com https://zoom.us https://*.zoom.us";

const CSP_BASE_DIRECTIVES_WITHOUT_FRAME = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline' 'unsafe-eval' ${STAPE_GTM_ORIGIN_LIST} ${META_PIXEL_SCRIPT_ORIGIN} ${HYROS_SCRIPT_ORIGIN} https://*.clerk.accounts.dev https://*.clerk.com https://clerk.theshivworksnetwork.com https://challenges.cloudflare.com https://*.cloudflareinsights.com https://browser.sentry-cdn.com https://*.sentry-cdn.com https://*.cloudflarestream.com https://embed.cloudflarestream.com`,
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"img-src 'self' data: blob: https:",
	"font-src 'self' data: https://fonts.gstatic.com",
	`connect-src 'self' ${STAPE_GTM_ORIGIN_LIST} ${HYROS_SCRIPT_ORIGIN} https://*.clerk.accounts.dev https://*.clerk.com https://clerk.theshivworksnetwork.com https://*.clerk.services https://clerk-telemetry.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://api.cloudflare.com https://*.cloudflarestream.com https://videodelivery.net https://shivworkspg.com`,
	"media-src 'self' blob: https://*.cloudflarestream.com https://videodelivery.net",
	"worker-src 'self' blob:",
	"object-src 'none'",
	"base-uri 'self'",
	"frame-ancestors 'none'"
];

const FORM_ACTION_ORIGINS = [
	'https://shivworkspg.com',
	'https://theshivworksnetwork.com',
	'https://www.theshivworksnetwork.com',
	'https://network.shivworks.com',
	'https://www.network.shivworks.com',
	'https://shivworks-network-4zu.pages.dev'
];

/** Allowlisted Circle / community embed origins only (https). */
export function resolveCircleFrameOrigin(
	runtimeEnv: Record<string, string | undefined>
): string | null {
	const raw = runtimeEnv.PUBLIC_CIRCLE_COMMUNITY_URL?.trim();
	if (!raw) return null;
	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== 'https:') return null;
		const host = parsed.hostname.toLowerCase();
		if (
			host === 'circle.so' ||
			host.endsWith('.circle.so') ||
			host.includes('circle') ||
			host.endsWith('.community')
		) {
			return parsed.origin;
		}
		// Allow configured community host even when not on circle.so (custom community domains).
		if (host.length > 0) {
			return parsed.origin;
		}
		return null;
	} catch {
		return null;
	}
}

export function buildContentSecurityPolicy(
	requestUrl: URL,
	runtimeEnv: Record<string, string | undefined>
): string {
	const formActionOrigins = new Set<string>(["'self'", ...FORM_ACTION_ORIGINS]);
	formActionOrigins.add(requestUrl.origin);

	const publicSiteUrl = runtimeEnv.PUBLIC_SITE_URL;
	if (publicSiteUrl) {
		try {
			formActionOrigins.add(new URL(publicSiteUrl).origin);
		} catch {
			// Ignore invalid PUBLIC_SITE_URL values.
		}
	}

	const circleOrigin = resolveCircleFrameOrigin(runtimeEnv);
	const frameSrc = circleOrigin
		? `frame-src ${FRAME_SRC_BASE} ${circleOrigin}`
		: `frame-src ${FRAME_SRC_BASE}`;

	return [
		...CSP_BASE_DIRECTIVES_WITHOUT_FRAME,
		frameSrc,
		`form-action ${[...formActionOrigins].join(' ')}`
	].join('; ');
}
