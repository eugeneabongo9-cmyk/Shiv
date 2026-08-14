-- Aaron Thomas curriculum order (orderofcourses.pdf, 2026-06-08).
-- Library course sort_order mirrors release sequence; first 3 at launch are
-- Origin Story + CAP (course_foundations) and MUC.

UPDATE courses
SET sort_order = CASE id
  WHEN 'course_foundations' THEN 1
  WHEN 'course_muc' THEN 2
  WHEN 'course_core_skills' THEN 3
  WHEN 'course_wrestling' THEN 4
  WHEN 'course_ifwa' THEN 5
  WHEN 'course_entangled_live_fire' THEN 6
  WHEN 'course_edged' THEN 7
  WHEN 'course_grounded' THEN 8
  WHEN 'course_retention' THEN 9
  WHEN 'course_products' THEN 10
  WHEN 'course_pcc' THEN 11
  ELSE sort_order
END,
updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id IN (
  'course_foundations',
  'course_muc',
  'course_core_skills',
  'course_wrestling',
  'course_ifwa',
  'course_entangled_live_fire',
  'course_edged',
  'course_grounded',
  'course_retention',
  'course_products',
  'course_pcc'
);

-- Launch availability: PDF items 1–3 (Origin Story, CAP, MUC).
UPDATE courses
SET status = 'available',
    badge_text = CASE id
      WHEN 'course_foundations' THEN 'Watch now'
      WHEN 'course_muc' THEN 'Free preview'
      ELSE badge_text
    END,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id IN ('course_foundations', 'course_muc');

UPDATE courses
SET status = 'coming_soon',
    badge_text = 'Coming Soon',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_core_skills'
  AND status = 'available';

UPDATE course_modules
SET status = 'available',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id IN ('module_origin', 'module_cap');
