import type { D1Compat } from '$lib/server/d1-compat';

export type RateLimitBucketState = {
	requestCount: number;
	windowEnd: number;
};

/**
 * Atomically consume one request against a fixed-window bucket.
 * Uses a single SQLite UPSERT — row-level locking prevents lost increments.
 */
export async function consumeRateLimitBucket(
	db: D1Compat,
	input: {
		bucketKey: string;
		limit: number;
		windowSeconds: number;
	}
): Promise<RateLimitBucketState & { allowed: boolean }> {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const proposedWindowEnd = nowSeconds + input.windowSeconds;
	const updatedAt = Date.now();

	const row = await db
		.prepare(
			`INSERT INTO rate_limit_buckets (bucket_key, window_end, request_count, updated_at)
			 VALUES (?, ?, 1, ?)
			 ON CONFLICT(bucket_key) DO UPDATE SET
				request_count = CASE
					WHEN rate_limit_buckets.window_end <= ? THEN 1
					ELSE rate_limit_buckets.request_count + 1
				END,
				window_end = CASE
					WHEN rate_limit_buckets.window_end <= ? THEN excluded.window_end
					ELSE rate_limit_buckets.window_end
				END,
				updated_at = excluded.updated_at
			 RETURNING request_count, window_end`
		)
		.bind(input.bucketKey, proposedWindowEnd, updatedAt, nowSeconds, nowSeconds)
		.first<{ request_count: number; window_end: number }>();

	const requestCount = Number(row?.request_count ?? 1);
	const windowEnd = Number(row?.window_end ?? proposedWindowEnd);

	return {
		requestCount,
		windowEnd,
		allowed: requestCount <= input.limit
	};
}

export async function recordRateLimitDenial(
	db: D1Compat,
	input: {
		bucketKey: string;
		requestCount: number;
		limit: number;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO rate_limit_denials (id, bucket_key, request_count, limit_value, created_at)
			 VALUES (?, ?, ?, ?, ?)`
		)
		.bind(crypto.randomUUID(), input.bucketKey, input.requestCount, input.limit, Date.now())
		.run();
}

/** Remove buckets whose window expired more than `graceSeconds` ago. */
export async function pruneExpiredRateLimitBuckets(
	db: D1Compat,
	graceSeconds = 86_400
): Promise<number> {
	const cutoff = Math.floor(Date.now() / 1000) - graceSeconds;
	const result = await db
		.prepare(`DELETE FROM rate_limit_buckets WHERE window_end < ?`)
		.bind(cutoff)
		.run();
	return result.meta.changes;
}
