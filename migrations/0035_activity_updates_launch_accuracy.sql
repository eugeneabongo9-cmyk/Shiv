-- Align build-log seed copy with what is actually live at launch.
-- VIP quarterly calls remain gated; three curriculum courses are playable.

DELETE FROM activity_updates WHERE id = 'upd_vip_track';

UPDATE activity_updates
SET
    title = 'Preview the Network before upgrading',
    body_markdown = 'Free access includes the build log, library roadmap, and founding checkout. Three curriculum blocks — Origin Story, CAP, and MUC — are live for paid members.',
    audience = 'free',
    published_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 86400000,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'upd_launch_window';

UPDATE activity_updates
SET
    title = 'Three courses are live in the library',
    body_markdown = 'Origin Story, Criminal Assault Paradigm (CAP), and Managing Unknown Contacts (MUC) are playable now. The full curriculum roadmap stays visible so you can see what ships next.',
    audience = 'member',
    published_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'upd_curriculum_map';
