CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'external'
    CHECK(provider IN ('external', 'cloudflare_stream')),
  provider_asset_id TEXT,
  title TEXT NOT NULL,
  file_name TEXT,
  source_url TEXT,
  source_bytes INTEGER,
  duration_seconds INTEGER,
  duration_label TEXT,
  playback_policy TEXT NOT NULL DEFAULT 'private'
    CHECK(playback_policy IN ('private', 'public')),
  ingest_status TEXT NOT NULL DEFAULT 'ready'
    CHECK(ingest_status IN ('pending_upload', 'processing', 'ready', 'failed')),
  failure_reason TEXT,
  created_by_member_id TEXT,
  uploaded_at INTEGER,
  playback_ready_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(created_by_member_id) REFERENCES members(clerk_user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_assets_provider_asset
  ON media_assets(provider, provider_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_ingest_status
  ON media_assets(ingest_status);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_by_member
  ON media_assets(created_by_member_id);

CREATE TABLE IF NOT EXISTS course_module_episodes (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  media_asset_id TEXT,
  episode_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'coming_soon'
    CHECK(status IN ('coming_soon', 'available', 'archived')),
  access_tier TEXT NOT NULL DEFAULT 'member'
    CHECK(access_tier IN ('free', 'member', 'vip')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  duration_label TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(module_id, episode_number),
  FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY(module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
  FOREIGN KEY(media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_course_module_episodes_course
  ON course_module_episodes(course_id, sort_order, episode_number);
CREATE INDEX IF NOT EXISTS idx_course_module_episodes_module
  ON course_module_episodes(module_id, sort_order, episode_number);
CREATE INDEX IF NOT EXISTS idx_course_module_episodes_media
  ON course_module_episodes(media_asset_id);

CREATE TABLE IF NOT EXISTS member_episode_progress (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  current_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(member_id, episode_id),
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE,
  FOREIGN KEY(episode_id) REFERENCES course_module_episodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_episode_progress_member
  ON member_episode_progress(member_id, updated_at DESC);

INSERT INTO media_assets (
  id,
  provider,
  provider_asset_id,
  title,
  file_name,
  source_url,
  source_bytes,
  duration_seconds,
  duration_label,
  playback_policy,
  ingest_status,
  failure_reason,
  created_by_member_id,
  uploaded_at,
  playback_ready_at,
  created_at,
  updated_at
)
SELECT
  'media_' || course_modules.id,
  CASE
    WHEN course_modules.video_url LIKE '/videos/%' THEN 'external'
    ELSE 'external'
  END,
  NULL,
  course_modules.title,
  NULL,
  course_modules.video_url,
  NULL,
  NULL,
  course_modules.duration_label,
  'private',
  'ready',
  NULL,
  NULL,
  course_modules.updated_at,
  course_modules.updated_at,
  course_modules.created_at,
  course_modules.updated_at
FROM course_modules
WHERE course_modules.video_url IS NOT NULL
  AND course_modules.video_url != ''
ON CONFLICT(id) DO NOTHING;

INSERT INTO course_module_episodes (
  id,
  course_id,
  module_id,
  media_asset_id,
  episode_number,
  title,
  description,
  status,
  access_tier,
  sort_order,
  duration_label,
  created_at,
  updated_at
)
SELECT
  'episode_' || course_modules.id,
  course_modules.course_id,
  course_modules.id,
  'media_' || course_modules.id,
  1,
  course_modules.title,
  course_modules.description,
  course_modules.status,
  courses.access_tier,
  course_modules.sort_order,
  course_modules.duration_label,
  course_modules.created_at,
  course_modules.updated_at
FROM course_modules
INNER JOIN courses ON courses.id = course_modules.course_id
WHERE course_modules.video_url IS NOT NULL
  AND course_modules.video_url != ''
ON CONFLICT(id) DO NOTHING;
