CREATE TABLE IF NOT EXISTS member_module_progress (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  current_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(member_id, module_id),
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE,
  FOREIGN KEY(module_id) REFERENCES course_modules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_module_progress_member
  ON member_module_progress(member_id, updated_at DESC);
