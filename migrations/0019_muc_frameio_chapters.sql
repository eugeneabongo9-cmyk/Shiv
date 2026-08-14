-- MUC full course from Frame.io share 6311ac9c-32a9-49bc-8fc4-4aab6ed91c69
-- Folder: 8a8d879f-7aec-4ba6-b686-347b66f41bc6 (11 chapters)

INSERT INTO course_modules (
  id,
  course_id,
  title,
  description,
  sort_order,
  status,
  video_kind,
  access_tier,
  created_at,
  updated_at
) VALUES (
  'module_muc',
  'course_muc',
  'Managing Unknown Contacts',
  'The complete MUC course — practical frameworks for unknown-contact encounters before they become fights.',
  1,
  'available',
  'none',
  'member',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  video_kind = excluded.video_kind,
  access_tier = excluded.access_tier,
  updated_at = excluded.updated_at;

UPDATE courses
SET status = 'available',
    badge_text = 'Free preview',
    access_tier = 'free',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_muc';

-- Chapter 1
INSERT INTO media_assets (
  id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at
) VALUES (
  'media_muc_ch01',
  'external',
  'MUC Chapter 1',
  'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/b446e4ed-9a63-42dc-8888-a8884d06d329',
  '01:17', 'private', 'ready',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;

INSERT INTO course_module_episodes (
  id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at
) VALUES (
  'episode_muc_ch01', 'course_muc', 'module_muc', 'media_muc_ch01', 1, 'Chapter 1', 'available', 'free', 1, '01:17',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, access_tier = excluded.access_tier, updated_at = excluded.updated_at;

-- Chapter 2
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch02', 'external', 'MUC Chapter 2', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/31e9d4e8-e381-47c9-be5b-b6284bece2e5', '07:42', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch02', 'course_muc', 'module_muc', 'media_muc_ch02', 2, 'Chapter 2', 'available', 'member', 2, '07:42', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;

-- Chapter 3
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch03', 'external', 'MUC Chapter 3', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/52d45efd-84ef-44e6-814d-8ceb31ec0a18', '05:59', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch03', 'course_muc', 'module_muc', 'media_muc_ch03', 3, 'Chapter 3', 'available', 'member', 3, '05:59', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;

-- Chapter 4
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch04', 'external', 'MUC Chapter 4', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/8460c728-abc3-43bc-a02c-4202eddf49a4', '03:06', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch04', 'course_muc', 'module_muc', 'media_muc_ch04', 4, 'Chapter 4', 'available', 'member', 4, '03:06', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;

-- Chapter 5
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch05', 'external', 'MUC Chapter 5', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/be898c9e-d38f-4443-b4e2-2a585a9f344d', '14:37', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch05', 'course_muc', 'module_muc', 'media_muc_ch05', 5, 'Chapter 5', 'available', 'member', 5, '14:37', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;

-- Chapter 6
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch06', 'external', 'MUC Chapter 6', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/4cf26fa1-8657-4a83-90cc-e0189a815680', '08:38', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch06', 'course_muc', 'module_muc', 'media_muc_ch06', 6, 'Chapter 6', 'available', 'member', 6, '08:38', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;

-- Chapter 7
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch07', 'external', 'MUC Chapter 7', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/69633d9e-bef7-468d-8204-d7e1abab7cec', '04:57', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch07', 'course_muc', 'module_muc', 'media_muc_ch07', 7, 'Chapter 7', 'available', 'member', 7, '04:57', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;

-- Chapter 8
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch08', 'external', 'MUC Chapter 8', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/04720c4c-4ac3-44ea-bf50-ea3c818a2d59', '06:32', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch08', 'course_muc', 'module_muc', 'media_muc_ch08', 8, 'Chapter 8', 'available', 'member', 8, '06:32', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;

-- Chapter 9
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch09', 'external', 'MUC Chapter 9', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/67ff4483-8e35-493e-b80f-914917fdb701', '08:30', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch09', 'course_muc', 'module_muc', 'media_muc_ch09', 9, 'Chapter 9', 'available', 'member', 9, '08:30', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;

-- Chapter 10
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch10', 'external', 'MUC Chapter 10', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/1f6ae66d-ef83-4748-ae54-ad6a582b008c', '06:45', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch10', 'course_muc', 'module_muc', 'media_muc_ch10', 10, 'Chapter 10', 'available', 'member', 10, '06:45', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;

-- Chapter 11 (End Summary)
INSERT INTO media_assets (id, provider, title, source_url, duration_label, playback_policy, ingest_status, created_at, updated_at)
VALUES ('media_muc_ch11', 'external', 'MUC End Summary', 'https://next.frame.io/share/6311ac9c-32a9-49bc-8fc4-4aab6ed91c69/view/ac0f61c9-8543-469f-865e-db41d2d94c9d', '02:39', 'private', 'ready', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, duration_label = excluded.duration_label, updated_at = excluded.updated_at;
INSERT INTO course_module_episodes (id, course_id, module_id, media_asset_id, episode_number, title, status, access_tier, sort_order, duration_label, created_at, updated_at)
VALUES ('episode_muc_ch11', 'course_muc', 'module_muc', 'media_muc_ch11', 11, 'End Summary', 'available', 'member', 11, '02:39', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(id) DO UPDATE SET media_asset_id = excluded.media_asset_id, status = excluded.status, updated_at = excluded.updated_at;
