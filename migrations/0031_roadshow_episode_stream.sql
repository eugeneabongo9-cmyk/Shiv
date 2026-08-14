-- Wire Roadshow Episode 1 to Cloudflare Stream and publish in the library (2026-06-10).

UPDATE courses
SET status = 'available',
    badge_text = 'Watch now',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'series_roadshow';

UPDATE course_modules
SET status = 'available',
    video_kind = 'embed',
    video_url = 'https://iframe.cloudflarestream.com/9751701a1c41a5112c14994566f990ae',
    published_at = COALESCE(published_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_roadshow_episode_1';
