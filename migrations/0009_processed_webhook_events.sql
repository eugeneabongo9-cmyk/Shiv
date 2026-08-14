-- Migration 0009 · processed_webhook_events
-- Idempotency log for inbound webhooks (WC, Clerk, Stream).
-- A row exists once we've successfully processed an event; replays are 2xx no-ops.

CREATE TABLE IF NOT EXISTS processed_webhook_events (
source TEXT NOT NULL,
event_id TEXT NOT NULL,
received_at INTEGER NOT NULL,
context TEXT,
PRIMARY KEY (source, event_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_received
ON processed_webhook_events (received_at);
