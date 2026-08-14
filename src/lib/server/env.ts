/**
 * Environment Variable Access
 *
 * - env(key) reads direct process.env (useful for scripts/tests).
 * - resolveRuntimeEnv merges local process.env with Worker/Pages runtime env so
 *   routes can call one helper in both environments.
 */

export function env(key: string): string | undefined {
	return process.env[key];
}

const RUNTIME_ENV_KEYS = [
	'ENVIRONMENT',
	'NODE_ENV',
	'PUBLIC_SITE_URL',
	'PUBLIC_SHIVWORKS_MAIN_SITE',
	'PUBLIC_SHIVWORKS_STORE_URL',
	'PUBLIC_SHIVWORKS_MEMBERSHIP_URL',
	'PUBLIC_CIRCLE_COMMUNITY_URL',
	'PUBLIC_SUPPORT_EMAIL',
	'PUBLIC_CLERK_PUBLISHABLE_KEY',
	'CLERK_SECRET_KEY',
	'CLERK_JWT_KEY',
	'CLERK_WEBHOOK_SIGNING_SECRET',
	'CLERK_AUTHORIZED_PARTIES',
	'RESEND_API_KEY',
	'EMAIL_FROM',
	'SUPPORT_EMAIL',
	'SHIVWORKS_ADMIN_EMAILS',
	'CLOUDFLARE_ACCOUNT_ID',
	'CF_ACCOUNT_ID',
	'CLOUDFLARE_STREAM_ACCOUNT_ID',
	'CLOUDFLARE_STREAM_API_TOKEN',
	'STREAM_API_TOKEN',
	'CLOUDFLARE_STREAM_WEBHOOK_SECRET',
	'CLOUDFLARE_STREAM_ALLOWED_ORIGINS',
	'STREAM_ALLOWED_ORIGINS',
	'VIDEO_STREAM_TOKEN_TTL_SECONDS',
	'SENTRY_DSN',
	'WC_WEBHOOK_SECRET',
	'CRON_SECRET',
	'WC_WEBHOOK_RETRY_SECRET',
	'ACTIVECAMPAIGN_API_URL',
	'ACTIVECAMPAIGN_API_KEY'
] as const;

export function resolveRuntimeEnv(
	platformEnv?: Record<string, string | undefined> | null
): Record<string, string | undefined> {
	const resolved: Record<string, string | undefined> = {};

	for (const [key, value] of Object.entries(process.env)) {
		resolved[key] = value;
	}

	if (platformEnv) {
		for (const [key, value] of Object.entries(platformEnv)) {
			if (typeof value === 'string') {
				resolved[key] = value;
			}
		}

		for (const key of RUNTIME_ENV_KEYS) {
			const value = (platformEnv as Record<string, unknown>)[key];
			if (typeof value === 'string') {
				resolved[key] = value;
			}
		}
	}

	return resolved;
}
