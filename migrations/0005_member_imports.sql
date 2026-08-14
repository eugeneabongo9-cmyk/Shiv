CREATE TABLE IF NOT EXISTS member_imports (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  access_status TEXT NOT NULL DEFAULT 'active',
  role TEXT NOT NULL DEFAULT 'member',
  source_ref TEXT,
  invited_at INTEGER,
  last_emailed_at INTEGER,
  claimed_member_id TEXT,
  claimed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(claimed_member_id) REFERENCES members(clerk_user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_member_imports_claimed_at ON member_imports(claimed_at);
CREATE INDEX IF NOT EXISTS idx_member_imports_email ON member_imports(email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_entitlements_source
ON member_entitlements(source_type, source_ref);
