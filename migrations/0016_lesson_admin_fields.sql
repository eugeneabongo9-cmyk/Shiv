-- Lesson admin fields: thumbnail, publish date, and per-lesson tier access.

ALTER TABLE course_modules ADD COLUMN thumbnail_url TEXT;
ALTER TABLE course_modules ADD COLUMN published_at INTEGER;
ALTER TABLE course_modules ADD COLUMN access_tier TEXT NOT NULL DEFAULT 'member'
  CHECK(access_tier IN ('free', 'member', 'vip'));

UPDATE course_modules
SET access_tier = (
  SELECT courses.access_tier
  FROM courses
  WHERE courses.id = course_modules.course_id
);
