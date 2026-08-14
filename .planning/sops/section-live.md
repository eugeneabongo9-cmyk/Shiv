# SOP — `routes/live`

## Purpose

Livestream landing — schedule, "live now" embed, post-stream recap link to library.

## Auth model

`requireEntitled` — paid tiers see embed; free tier sees schedule + upsell.

## Data dependencies

- Planned `events` table (currently scheduled livestreams may live in constants — confirm during impl).
- Cloudflare Stream live input (when live ingestion goes live).

## Error contract

- Stream not live yet → render countdown.
- Stream errored mid-broadcast → render "We're experiencing technical issues; check email for makeup link" + log to Sentry with high-severity tag.

## Test bar

- Unit: scheduled-vs-live state machine.
- Smoke: auth-gated — page renders with either schedule or live element visible.

## Deploy notes

- Live-day deploys are forbidden. Freeze this route 24h before any scheduled stream.
- Reminder emails sent via `email/templates/livestream-reminder.ts`.
