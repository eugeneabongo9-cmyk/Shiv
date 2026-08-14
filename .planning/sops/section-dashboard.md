# SOP — `routes/dashboard`

## Purpose

Member home. Personalized: current course progress, upcoming live events, VIP call status, recent updates.

## Auth model

`requireAuthenticated`. Free tier sees a stripped-down dashboard with conversion CTAs.

## Data dependencies

- `members`, `member_episode_progress`, `course_modules`, `course_module_episodes`, `media_assets`, planned `events` table.

## Error contract

- Partial data failure (e.g. progress query throws) → render dashboard with the broken card replaced by a "Couldn't load this section" placeholder. Do **not** 500 the whole page. Log per-card to Sentry with `scope=dashboard.<card>`.

## Test bar

- Unit: progress aggregation utilities (`course-order.ts` is the existing seed; extend).
- Smoke: auth-gated — logged-in member lands on `/dashboard` and sees `<h1>` containing their first name.
- Visual regression: in scope after hi-fi wireframe lands (task w260).

## Deploy notes

- Hi-fi wireframe (task w260) drives the next dashboard rebuild; do not patch piecemeal before that lands.
