// D1-backed atomic fixed-window rate limiter.
//
// Each bucket is incremented via a single SQLite UPSERT (row-level lock). Unlike
// KV read-modify-write, concurrent requests cannot lose increments or bypass limits.

import type { D1Compat } from '$lib/server/d1-compat';
import { consumeRateLimitBucket, recordRateLimitDenial } from '$lib/server/db/rate-limit';

export interface RateLimitOptions {
	db: D1Compat;
	key: string;
	limit: number;
	windowSeconds: number;
	/** Persist denials to rate_limit_denials for observability (default: true). */
	auditDenials?: boolean;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	retryAfterSeconds: number;
	requestCount: number;
}

export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
	const { db, key, limit, windowSeconds, auditDenials = true } = opts;

	try {
		const state = await consumeRateLimitBucket(db, {
			bucketKey: key,
			limit,
			windowSeconds
		});

		const nowSeconds = Math.floor(Date.now() / 1000);
		const retryAfterSeconds = Math.max(1, state.windowEnd - nowSeconds);

		if (!state.allowed) {
			console.info('rate_limit_denied', {
				key,
				limit,
				requestCount: state.requestCount,
				windowEnd: state.windowEnd
			});

			if (auditDenials) {
				try {
					await recordRateLimitDenial(db, {
						bucketKey: key,
						requestCount: state.requestCount,
						limit
					});
				} catch (error) {
					console.error('rate_limit_denial_audit_failed', {
						key,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
		}

		return {
			allowed: state.allowed,
			remaining: Math.max(0, limit - state.requestCount),
			retryAfterSeconds: state.allowed ? 0 : retryAfterSeconds,
			requestCount: state.requestCount
		};
	} catch (error) {
		console.error('rate_limit_check_failed', {
			key,
			error: error instanceof Error ? error.message : String(error)
		});

		// Fail closed: do not allow bypass when enforcement is unavailable.
		return {
			allowed: false,
			remaining: 0,
			retryAfterSeconds: 60,
			requestCount: limit + 1
		};
	}
}
