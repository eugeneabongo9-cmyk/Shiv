-- Wire Criminal Assault Paradigm to the successful Cloudflare Stream upload (2026-06-10).

UPDATE media_assets
SET provider_asset_id = 'd19d0772b61628140fc8fd51f8ac79d5',
    duration_seconds = 1210,
    duration_label = '20:10',
    ingest_status = 'ready',
    failure_reason = NULL,
    playback_ready_at = COALESCE(playback_ready_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = '60abf7b5-8e0a-4303-af8c-c16bb28dbeba';

UPDATE course_module_episodes
SET title = 'Criminal Assault Paradigm',
    status = 'available',
    duration_label = '20:10',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = '6fcb6408-b2f9-411b-acf0-3a079c16e674';

UPDATE course_modules
SET duration_label = '20 min',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'module_cap';
