-- Split Origin Story and CAP into separate library courses; member-only playback labels (2026-06-09).

UPDATE courses
SET title = 'ShivWorks Origin Story',
    slug = 'shivworks-origin-story',
    description = 'How Craig Douglas built the method from real experience and decades of work.',
    badge_text = 'Watch now',
    access_tier = 'member',
    sort_order = 1,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_foundations';

INSERT INTO courses (
    id,
    slug,
    title,
    description,
    status,
    sort_order,
    badge_text,
    artwork_url,
    course_kind,
    access_tier,
    created_at,
    updated_at
)
VALUES (
    'course_cap',
    'criminal-assault-paradigm',
    'Criminal Assault Paradigm (CAP)',
    'The conceptual foundation for understanding criminal assault behavior.',
    'available',
    2,
    'Watch now',
    NULL,
    'course',
    'member',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
)
ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    sort_order = excluded.sort_order,
    badge_text = excluded.badge_text,
    access_tier = excluded.access_tier,
    updated_at = excluded.updated_at;

UPDATE course_modules
SET course_id = 'course_cap',
    sort_order = 1,
    access_tier = 'member',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_cap';

UPDATE course_modules
SET sort_order = 1,
    access_tier = 'member',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_origin';

UPDATE courses
SET access_tier = 'member',
    badge_text = 'Watch now',
    sort_order = 3,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_muc';

UPDATE courses SET sort_order = 4, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'course_core_skills';
UPDATE courses SET sort_order = 5, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'course_pcc';
UPDATE courses SET sort_order = 6, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'course_wrestling';
UPDATE courses SET sort_order = 7, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'course_ifwa';
UPDATE courses SET sort_order = 8, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'course_entangled_live_fire';
UPDATE courses SET sort_order = 9, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'course_edged';
UPDATE courses SET sort_order = 10, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'course_grounded';
UPDATE courses SET sort_order = 11, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'course_retention';
UPDATE courses SET sort_order = 12, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'course_products';

UPDATE course_module_episodes
SET access_tier = 'member'
WHERE course_id = 'course_muc';

UPDATE course_modules
SET access_tier = 'member'
WHERE course_id = 'course_muc';
