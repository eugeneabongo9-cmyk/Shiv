-- Replace Frame.io embed URLs with self-hosted MP4 paths (static/videos/…).

UPDATE media_assets SET source_url = '/videos/muc/chapter-01.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch01';
UPDATE media_assets SET source_url = '/videos/muc/chapter-02.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch02';
UPDATE media_assets SET source_url = '/videos/muc/chapter-03.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch03';
UPDATE media_assets SET source_url = '/videos/muc/chapter-04.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch04';
UPDATE media_assets SET source_url = '/videos/muc/chapter-05.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch05';
UPDATE media_assets SET source_url = '/videos/muc/chapter-06.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch06';
UPDATE media_assets SET source_url = '/videos/muc/chapter-07.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch07';
UPDATE media_assets SET source_url = '/videos/muc/chapter-08.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch08';
UPDATE media_assets SET source_url = '/videos/muc/chapter-09.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch09';
UPDATE media_assets SET source_url = '/videos/muc/chapter-10.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch10';
UPDATE media_assets SET source_url = '/videos/muc/chapter-11.mp4', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id = 'media_muc_ch11';
