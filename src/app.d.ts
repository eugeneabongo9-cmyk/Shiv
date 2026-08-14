declare global {
	namespace App {
		// Shape of $page.error inside +error.svelte boundaries.
		// Augments SvelteKit's default { message: string } with our taxonomy.
		// Mirrored from src/lib/errors/codes.ts.
		interface Error {
			message: string;
			code?:
				| 'AUTH_REQUIRED'
				| 'AUTH_FORBIDDEN'
				| 'NOT_FOUND'
				| 'INVALID_INPUT'
				| 'RATE_LIMITED'
				| 'PAYMENT_REQUIRED'
				| 'UPSTREAM_FAILURE'
				| 'INTERNAL_ERROR'
				| 'CLIENT_ERROR';
			eventId?: string;
		}

		interface Locals {
			auth: {
				userId: string | null;
				sessionId: string | null;
				isAuthenticated: boolean;
			};
			user: {
				clerkUserId: string;
				email: string;
				name: string;
				tier: 'free' | 'bronze' | 'vip' | null;
				accessStatus: 'none' | 'active' | 'revoked';
				role: 'member' | 'admin';
				createdAt: string;
				updatedAt: string;
			} | null;
		}

		interface Platform {
			env: {
				DB?: import('@cloudflare/workers-types').D1Database;
				ENVIRONMENT?: string;
				PUBLIC_SITE_URL?: string;
				PUBLIC_SHIVWORKS_MAIN_SITE?: string;
				PUBLIC_SHIVWORKS_STORE_URL?: string;
				PUBLIC_SHIVWORKS_MEMBERSHIP_URL?: string;
				PUBLIC_CIRCLE_COMMUNITY_URL?: string;
				PUBLIC_SUPPORT_EMAIL?: string;
				PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
				CLERK_SECRET_KEY?: string;
				CLERK_JWT_KEY?: string;
				CLERK_WEBHOOK_SIGNING_SECRET?: string;
				CLERK_AUTHORIZED_PARTIES?: string;
				RESEND_API_KEY?: string;
				EMAIL_FROM?: string;
				SHIVWORKS_ADMIN_EMAILS?: string;
				SUPPORT_EMAIL?: string;
				CLOUDFLARE_ACCOUNT_ID?: string;
				CF_ACCOUNT_ID?: string;
				CLOUDFLARE_STREAM_ACCOUNT_ID?: string;
				CLOUDFLARE_STREAM_API_TOKEN?: string;
				STREAM_API_TOKEN?: string;
				CLOUDFLARE_STREAM_WEBHOOK_SECRET?: string;
				CLOUDFLARE_STREAM_ALLOWED_ORIGINS?: string;
				STREAM_ALLOWED_ORIGINS?: string;
				VIDEO_STREAM_TOKEN_TTL_SECONDS?: string;
				KV?: import('@cloudflare/workers-types').KVNamespace;
			};
		}
	}
}

export {};
