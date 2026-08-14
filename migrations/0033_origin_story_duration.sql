-- Origin Story is the full ~26 minute course, not the old 6 minute preview (2026-06-11).

UPDATE course_modules
SET duration_label = '26 min',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_origin';
