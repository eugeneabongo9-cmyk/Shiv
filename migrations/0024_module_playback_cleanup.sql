-- Remove auto-migrated mirror episodes that duplicate module-level playback (2026-06-09).

DELETE FROM member_episode_progress
WHERE episode_id IN ('episode_module_origin', 'episode_module_cap');

DELETE FROM course_module_episodes
WHERE id IN ('episode_module_origin', 'episode_module_cap');

DELETE FROM media_assets
WHERE id IN ('media_module_origin', 'media_module_cap');

UPDATE course_modules
SET video_kind = 'embed',
    video_url = 'https://iframe.cloudflarestream.com/d18c5e8f88b8d64497b4c8b22fd7caf2',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_origin';

UPDATE courses
SET description = 'How to seize initiative when contact turns physical.',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_core_skills';

UPDATE courses
SET description = 'What to do when you lose initiative and need to recover the default position.',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_pcc';
