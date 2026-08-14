-- Align library course titles and sort_order with landing page curriculum (2026-06-09).

UPDATE courses
SET title = 'Seizing Initiative',
    sort_order = 3,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_core_skills';

UPDATE courses
SET title = 'Lost Initiative and the Default Position',
    sort_order = 4,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_pcc';

UPDATE courses
SET sort_order = 5,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_wrestling';

UPDATE courses
SET title = 'ShivWorks Handgun In-Fight Weapons Access (IFWA) — Standing and Grounded',
    sort_order = 6,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_ifwa';

UPDATE courses
SET title = 'ShivWorks Entangled Shooting — Live Fire Module',
    sort_order = 7,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_entangled_live_fire';

UPDATE courses
SET sort_order = 8,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_edged';

UPDATE courses
SET sort_order = 9,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_grounded';

UPDATE courses
SET sort_order = 10,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_retention';

UPDATE courses
SET sort_order = 11,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_products';
