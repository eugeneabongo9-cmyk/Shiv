# SOP — `routes/updates`

## Purpose

In-app changelog / announcements for members. Backed by content stored in DB (admin authors via `/admin`).

## Auth model

`requireAuthenticated`. Free tier sees public updates only; paid tiers see member-only updates.

## Data dependencies

- Planned `updates` table (or whatever the existing schema names it — verify in impl).
- `member_content_release_alerts` (existing migration `0007`).

## Error contract

- Empty list → render "No updates yet" empty state, not error.
- Per-update render failure → skip the offending update + log, continue list.

## Test bar

- Unit: tier-filtering of the update list.
- Smoke: auth-gated — page renders, list element present (may be empty).

## Deploy notes

- New update categories require an `email/templates/update-notification.ts` template update + a content release migration.
