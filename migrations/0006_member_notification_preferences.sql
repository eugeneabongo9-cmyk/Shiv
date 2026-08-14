CREATE TABLE IF NOT EXISTS member_notification_preferences (
  member_id TEXT PRIMARY KEY,
  build_updates INTEGER NOT NULL DEFAULT 1,
  livestream_reminders INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE
);
