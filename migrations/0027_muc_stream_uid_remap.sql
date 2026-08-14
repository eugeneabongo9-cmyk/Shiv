-- Remap MUC Cloudflare Stream UIDs to match chapter titles (uploads were mislabeled).
-- Upload slot ch01 = Chapter 2 footage, ch02 = Chapter 3, ch03 = Chapter 8, ch04 = Chapter 7,
-- ch05 = Chapter 10, ch06 = Chapter 4, ch07 = Chapter 9, ch08 = Chapter 5, ch09 = Chapter 6,
-- ch10 = End Summary, ch11 = Chapter 1.

UPDATE media_assets
SET provider_asset_id = '14b1aa4d5c492dc28879747f263dc48a',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch01';

UPDATE media_assets
SET provider_asset_id = 'f81a09d96e3658acc7924b530462a57d',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch02';

UPDATE media_assets
SET provider_asset_id = 'e700eddf0a8953ab34e50e7cd1a8785e',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch03';

UPDATE media_assets
SET provider_asset_id = '3d34eea88881150c3c1586db64e98a57',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch04';

UPDATE media_assets
SET provider_asset_id = 'f135a553bb873a688119b8178828ac21',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch05';

UPDATE media_assets
SET provider_asset_id = '82e6ee2a272a78b22ecb469d1342d257',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch06';

UPDATE media_assets
SET provider_asset_id = 'fe1ab50edcffe26a8b879e2e1ba5eee4',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch07';

UPDATE media_assets
SET provider_asset_id = '73fb8bc39a722f255f898e6f38832094',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch08';

UPDATE media_assets
SET provider_asset_id = 'b41cac7862026e0b326a5540af116075',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch09';

UPDATE media_assets
SET provider_asset_id = 'a0137f0f80123d5860611b07f046a5f7',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch10';

UPDATE media_assets
SET provider_asset_id = '9f92528730574fdfcbbc881d5dc76971',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'media_muc_ch11';
