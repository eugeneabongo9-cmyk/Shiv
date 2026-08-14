-- MUC curriculum playback order (Aaron sequence, 2026-06-09).
-- Sidebar order: Ch2, Ch3, Ch8, Ch7, Ch10, Ch4, Ch9, Ch5, Ch6, End Summary, Ch1.

UPDATE course_module_episodes
SET episode_number = 101, sort_order = 101, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch01';

UPDATE course_module_episodes
SET episode_number = 102, sort_order = 102, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch02';

UPDATE course_module_episodes
SET episode_number = 103, sort_order = 103, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch03';

UPDATE course_module_episodes
SET episode_number = 104, sort_order = 104, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch04';

UPDATE course_module_episodes
SET episode_number = 105, sort_order = 105, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch05';

UPDATE course_module_episodes
SET episode_number = 106, sort_order = 106, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch06';

UPDATE course_module_episodes
SET episode_number = 107, sort_order = 107, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch07';

UPDATE course_module_episodes
SET episode_number = 108, sort_order = 108, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch08';

UPDATE course_module_episodes
SET episode_number = 109, sort_order = 109, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch09';

UPDATE course_module_episodes
SET episode_number = 110, sort_order = 110, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch10';

UPDATE course_module_episodes
SET episode_number = 111, sort_order = 111, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch11';

UPDATE course_module_episodes
SET sort_order = 1, episode_number = 1, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch02';

UPDATE course_module_episodes
SET sort_order = 2, episode_number = 2, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch03';

UPDATE course_module_episodes
SET sort_order = 3, episode_number = 3, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch08';

UPDATE course_module_episodes
SET sort_order = 4, episode_number = 4, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch07';

UPDATE course_module_episodes
SET sort_order = 5, episode_number = 5, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch10';

UPDATE course_module_episodes
SET sort_order = 6, episode_number = 6, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch04';

UPDATE course_module_episodes
SET sort_order = 7, episode_number = 7, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch09';

UPDATE course_module_episodes
SET sort_order = 8, episode_number = 8, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch05';

UPDATE course_module_episodes
SET sort_order = 9, episode_number = 9, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch06';

UPDATE course_module_episodes
SET sort_order = 10, episode_number = 10, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch11';

UPDATE course_module_episodes
SET sort_order = 11, episode_number = 11, updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'episode_muc_ch01';
