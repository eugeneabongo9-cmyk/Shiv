CREATE TABLE IF NOT EXISTS member_module_notes (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(member_id, module_id),
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE,
  FOREIGN KEY(module_id) REFERENCES course_modules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_module_notes_member
  ON member_module_notes(member_id, updated_at DESC);
