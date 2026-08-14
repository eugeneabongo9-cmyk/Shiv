-- Immutable audit trail for every session revocation (manual, device-limit, admin, Clerk sync).
CREATE TABLE IF NOT EXISTS session_revocation_events (
	id TEXT PRIMARY KEY,
	member_id TEXT NOT NULL,
	session_id TEXT NOT NULL,
	reason TEXT NOT NULL,
	actor TEXT NOT NULL,
	device_label TEXT,
	ip_address TEXT,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (member_id) REFERENCES members (clerk_user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_revocation_events_member_created
	ON session_revocation_events (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_revocation_events_session
	ON session_revocation_events (session_id, created_at DESC);
