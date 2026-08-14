-- Launch curriculum: ECQC index order (0015) + first available blocks at go-live.
-- MUC (#01), Foundations (#06), and Core Skills (#07) ship with trailers/content.

UPDATE courses
SET status = 'available',
    badge_text = CASE id
      WHEN 'course_muc' THEN 'Free preview'
      WHEN 'course_foundations' THEN 'Watch now'
      WHEN 'course_core_skills' THEN 'Member video'
      ELSE badge_text
    END,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id IN ('course_muc', 'course_foundations', 'course_core_skills');
