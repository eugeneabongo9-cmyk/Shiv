-- w431-a: Gamification data model
-- Stores per-member rank, training points, and streak state.
-- Populated by future calculation engine; display-only at launch.

CREATE TABLE IF NOT EXISTS member_gamification (
  member_id           TEXT PRIMARY KEY,
  rank                TEXT,
  training_points     INTEGER NOT NULL DEFAULT 0,
  streak_days         INTEGER NOT NULL DEFAULT 0,
  last_activity_date  TEXT,
  updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_gamification_member_id
  ON member_gamification (member_id);
