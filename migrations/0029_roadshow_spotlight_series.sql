-- Add Roadshow and ShivWorks Spotlights as uploadable library series.

INSERT INTO courses (
    id,
    slug,
    title,
    description,
    status,
    sort_order,
    badge_text,
    artwork_url,
    course_kind,
    access_tier,
    created_at,
    updated_at
)
VALUES
    (
        'series_roadshow',
        'the-roadshow',
        'The Roadshow',
        'A video series from the ShivWorks road schedule, training rooms, and real conversations around the work.',
        'coming_soon',
        100,
        'Coming Soon',
        NULL,
        'series',
        'member',
        CAST(strftime('%s', 'now') AS INTEGER) * 1000,
        CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
        'series_spotlights',
        'shivworks-spotlights',
        'ShivWorks Spotlights',
        'Focused ShivWorks stories, lessons, and member-ready video drops from the broader training network.',
        'coming_soon',
        110,
        'Coming Soon',
        NULL,
        'series',
        'member',
        CAST(strftime('%s', 'now') AS INTEGER) * 1000,
        CAST(strftime('%s', 'now') AS INTEGER) * 1000
    )
ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    sort_order = excluded.sort_order,
    badge_text = excluded.badge_text,
    course_kind = excluded.course_kind,
    access_tier = excluded.access_tier,
    updated_at = excluded.updated_at;

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
    thumbnail_url,
    published_at,
    access_tier,
    created_at,
    updated_at
)
VALUES
    (
        'module_roadshow_episode_1',
        'series_roadshow',
        'Roadshow Episode 1',
        'The first Roadshow episode, ready for Aaron to upload and stage.',
        1,
        'coming_soon',
        'none',
        NULL,
        NULL,
        NULL,
        NULL,
        'member',
        CAST(strftime('%s', 'now') AS INTEGER) * 1000,
        CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
        'module_spotlight_episode_1',
        'series_spotlights',
        'ShivWorks Spotlight Episode 1',
        'The first Spotlight episode planned for July 2026.',
        1,
        'coming_soon',
        'none',
        NULL,
        NULL,
        NULL,
        NULL,
        'member',
        CAST(strftime('%s', 'now') AS INTEGER) * 1000,
        CAST(strftime('%s', 'now') AS INTEGER) * 1000
    )
ON CONFLICT(id) DO UPDATE SET
    course_id = excluded.course_id,
    title = excluded.title,
    description = excluded.description,
    sort_order = excluded.sort_order,
    status = excluded.status,
    access_tier = excluded.access_tier,
    updated_at = excluded.updated_at;
