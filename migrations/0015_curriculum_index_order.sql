-- Align course sort_order with the UX / ECQC curriculum index (MUC = 01).
-- Index 05 is reserved in marketing for Push Dagger; Clinch + Push share course_products at 04.

UPDATE courses
SET sort_order = CASE id
  WHEN 'course_muc' THEN 1
  WHEN 'course_wrestling' THEN 2
  WHEN 'course_entangled_live_fire' THEN 3
  WHEN 'course_products' THEN 4
  WHEN 'course_foundations' THEN 6
  WHEN 'course_core_skills' THEN 7
  WHEN 'course_pcc' THEN 8
  WHEN 'course_grounded' THEN 9
  WHEN 'course_edged' THEN 10
  WHEN 'course_ifwa' THEN 11
  WHEN 'course_retention' THEN 11
  ELSE sort_order
END,
updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id IN (
  'course_muc',
  'course_wrestling',
  'course_entangled_live_fire',
  'course_products',
  'course_foundations',
  'course_core_skills',
  'course_pcc',
  'course_grounded',
  'course_edged',
  'course_ifwa',
  'course_retention'
);

UPDATE courses
SET access_tier = 'vip',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id IN ('course_entangled_live_fire', 'course_ifwa', 'course_retention')
  AND access_tier != 'vip';
