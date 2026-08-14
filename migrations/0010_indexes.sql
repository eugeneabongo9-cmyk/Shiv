-- w451: Hot-path index additions.
--
-- members(email) — explicit index for the claimImportedMemberProvision lookup
-- (lower(email) = lower(?) query in shivworks.ts). The UNIQUE constraint on
-- members.email already creates an implicit index in SQLite; this makes it
-- explicit and named for EXPLAIN QUERY PLAN visibility.
CREATE INDEX IF NOT EXISTS idx_members_email
  ON members(email);

-- member_episode_progress(member_id, episode_id) — covering index for the
-- point-lookup pattern "WHERE member_id = ? AND episode_id = ?". The existing
-- idx_member_episode_progress_member index covers (member_id, updated_at DESC)
-- for chronological scans but not episode-ID point lookups.
CREATE INDEX IF NOT EXISTS idx_member_episode_progress_member_episode
  ON member_episode_progress(member_id, episode_id);

-- course_module_episodes(module_id) — single-column index for
-- "WHERE module_id = ?" used in episode listing. Note: the existing
-- idx_course_module_episodes_module (module_id, sort_order, episode_number)
-- already covers this access pattern; this index is added explicitly per w451
-- for named-index observability and future query plan auditing.
CREATE INDEX IF NOT EXISTS idx_course_module_episodes_module_id
  ON course_module_episodes(module_id);
