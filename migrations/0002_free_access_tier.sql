ALTER TABLE courses ADD COLUMN access_tier TEXT NOT NULL DEFAULT 'member';
ALTER TABLE series ADD COLUMN access_tier TEXT NOT NULL DEFAULT 'member';

UPDATE members
SET tier = 'free',
    access_status = 'active',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE (tier IS NULL OR tier = '')
  AND access_status = 'none';

UPDATE activity_updates SET audience = 'member' WHERE audience = 'all';
UPDATE external_links SET audience = 'member' WHERE audience = 'all';
UPDATE events SET access_tier = 'member' WHERE access_tier = 'all';

UPDATE activity_updates
SET title = 'Free access is live',
    body_markdown = 'The ShivWorks Network is now open with a free-access lane. Review the roadmap preview, free live touchpoints, and operational updates here, then upgrade to unlock the full curriculum and private member community.',
    audience = 'free',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'upd_launch_window';

UPDATE courses
SET access_tier = 'free',
    badge_text = 'Free preview',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'course_foundations';

UPDATE series
SET access_tier = 'free',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'series_roadshow';

UPDATE events
SET title = 'Open Access Livestream',
    description = 'A free-access update on the platform rollout, current production schedule, and upcoming content drops.',
    access_tier = 'free',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'event_launch_live';

UPDATE external_links
SET audience = 'free',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id IN ('link_book_course', 'link_shop_products');
