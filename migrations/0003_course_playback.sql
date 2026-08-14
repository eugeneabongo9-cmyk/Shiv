ALTER TABLE course_modules ADD COLUMN video_kind TEXT NOT NULL DEFAULT 'none';
ALTER TABLE course_modules ADD COLUMN video_url TEXT;
ALTER TABLE course_modules ADD COLUMN duration_label TEXT;

UPDATE courses
SET status = 'available',
    badge_text = 'Watch now',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_foundations';

UPDATE course_modules
SET status = 'available',
    video_kind = 'mp4',
    video_url = '/videos/shivworks-free-preview.mp4',
    duration_label = '06 min',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_origin';

UPDATE course_modules
SET duration_label = '08 min',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_cap';

UPDATE courses
SET status = 'available',
    badge_text = 'Member video',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_core_skills';

INSERT INTO course_modules (
  id,
  course_id,
  title,
  description,
  sort_order,
  status,
  video_kind,
  video_url,
  duration_label,
  created_at,
  updated_at
) VALUES (
  'module_core_platform_brief',
  'course_core_skills',
  'Core Skills Platform Brief',
  'A member-only walkthrough of how the first live training block is staged inside the network and how future releases will unlock.',
  1,
  'available',
  'mp4',
  '/videos/shivworks-member-brief.mp4',
  '08 min',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
