-- Wire ShivWorks Origin Story library module to Cloudflare Stream (2026-06-09).

UPDATE course_modules
SET video_kind = 'embed',
    video_url = 'https://iframe.cloudflarestream.com/d18c5e8f88b8d64497b4c8b22fd7caf2',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_origin';
