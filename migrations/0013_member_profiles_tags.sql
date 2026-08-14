CREATE TABLE IF NOT EXISTS member_profiles (
  member_id TEXT PRIMARY KEY,
  location_city TEXT,
  location_state TEXT,
  background_civilian INTEGER NOT NULL DEFAULT 0,
  background_le INTEGER NOT NULL DEFAULT 0,
  background_military INTEGER NOT NULL DEFAULT 0,
  background_medical INTEGER NOT NULL DEFAULT 0,
  background_other INTEGER NOT NULL DEFAULT 0,
  ecqc_alumni INTEGER NOT NULL DEFAULT 0,
  muc_alumni INTEGER NOT NULL DEFAULT 0,
  other_courses TEXT,
  carry_setup TEXT,
  training_goal TEXT,
  show_in_finder INTEGER NOT NULL DEFAULT 1,
  profile_completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_profiles_state ON member_profiles(location_state);
CREATE INDEX IF NOT EXISTS idx_member_profiles_finder ON member_profiles(show_in_finder, location_state);

CREATE TABLE IF NOT EXISTS member_tags (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  tag_key TEXT NOT NULL,
  tag_value TEXT,
  assigned_by TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_tags_member_key_value
  ON member_tags(member_id, tag_key, COALESCE(tag_value, ''));
CREATE INDEX IF NOT EXISTS idx_member_tags_member ON member_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_member_tags_key ON member_tags(tag_key, tag_value);

-- D-2 (2026-05-31): leaderboard opt-in preference. The leaderboard surface
-- itself is deferred post-launch, but the toggle in /account writes here so
-- when the leaderboard ships, opt-ins are already captured.
CREATE TABLE IF NOT EXISTS leaderboard_opt_in (
  member_id           TEXT PRIMARY KEY,
  show_on_leaderboard INTEGER NOT NULL DEFAULT 0,
  updated_at          INTEGER NOT NULL,
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE
);
