-- Migration 0036 · Durable WooCommerce webhook pipeline
-- Replaces fire-and-forget idempotency with traceable event records,
-- per-step audit log, retry scheduling, and dead-letter handling.
--
-- Rollback: DROP TABLE webhook_processing_steps; DROP TABLE webhook_events;
-- WC handler can fall back to processed_webhook_events (migration 0009).

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'wc',
  event_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  order_id TEXT,
  email TEXT,
  tier TEXT,
  payload_snapshot TEXT,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at INTEGER,
  last_error TEXT,
  failed_step TEXT,
  received_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status_retry
  ON webhook_events (status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received
  ON webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_order
  ON webhook_events (order_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_email
  ON webhook_events (email);

CREATE TABLE IF NOT EXISTS webhook_processing_steps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  error TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  metadata TEXT,
  FOREIGN KEY(event_id) REFERENCES webhook_events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhook_processing_steps_event
  ON webhook_processing_steps (event_id, started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_processing_steps_attempt
  ON webhook_processing_steps (event_id, step, attempt);
