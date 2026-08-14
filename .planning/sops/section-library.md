# SOP — `routes/library`

## Purpose

Course catalogue + episode playback. The longest-running surface — multi-episode modules backed by Cloudflare Stream.

## Subtree

- `library/+page` — module index
- `library/[slug]/+page` — module detail + episode list + player
- `api/library/episodes/[episodeId]/playback` — signed playback URL
- `api/library/episodes/[episodeId]/progress` — write progress
- `api/library/modules/[moduleId]/progress` — aggregate read

## Auth model

- Index + module pages: `requireEntitled` (any active tier).
- Specific episodes may be VIP-only — gated per `episode.tier_required` (verify in `db/shivworks.ts`).
- Playback URL endpoint: `requireEntitled` **and** revalidate per-episode tier server-side. Never trust client-side filter.

## Data dependencies

- `courses`, `course_modules`, `course_module_episodes`, `media_assets`, `member_episode_progress`, `member_module_progress`.
- Cloudflare Stream API (signed URLs, webhook).

## Error contract

- Missing/expired media asset → episode card shows "Coming soon" placeholder. Code `NOT_FOUND`.
- Stream API failure → player surfaces "Unable to load video" with retry + event ID. Code `UPSTREAM_FAILURE`.
- Progress save failure → client retries silently (debounced); after 3 failures show a non-blocking toast.

## Test bar

- Unit: progress aggregation, signed-URL generation (mock CF API), tier gating per episode.
- Smoke: auth-gated — open a known module, assert the episode list renders and the first episode tile is clickable.
- Manual: full episode playback start → 25% → 50% → 95% → completion event fired.

## Deploy notes

- Migrations touching `media_assets`, `course_module_episodes`, or progress tables: run on D1 staging first; verify episode list still renders.
- Stream webhook status sync (commit `ac4d972`) must remain working — add a smoke that asserts a `media_assets` row exists for the smoke-test module.
