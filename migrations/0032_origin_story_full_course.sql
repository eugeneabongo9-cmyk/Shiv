-- Wire ShivWorks Origin Story library module to the full course upload (2026-06-11).

UPDATE course_modules
SET video_kind = 'embed',
    video_url = 'https://iframe.cloudflarestream.com/9d41640818371252d2387bd0fc8a3036',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_origin';
