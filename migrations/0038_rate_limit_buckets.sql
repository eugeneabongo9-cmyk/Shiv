-- Atomic fixed-window rate limit buckets (replaces race-prone KV read-modify-write).
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
	bucket_key TEXT PRIMARY KEY,
	window_end INTEGER NOT NULL,
	request_count INTEGER NOT NULL DEFAULT 0,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window_end
	ON rate_limit_buckets (window_end);

-- Denial audit trail for observability (append-only; prune via scheduled job).
CREATE TABLE IF NOT EXISTS rate_limit_denials (
	id TEXT PRIMARY KEY,
	bucket_key TEXT NOT NULL,
	request_count INTEGER NOT NULL,
	limit_value INTEGER NOT NULL,
	created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_denials_bucket_created
	ON rate_limit_denials (bucket_key, created_at DESC);
