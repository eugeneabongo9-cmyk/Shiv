# SOP — `routes/+page` (landing) & `routes/welcome`

## Purpose

- `/` (landing): public marketing page — tier cards, founding-member tracker, copy that converts.
- `/welcome`: post-signup onboarding interstitial — sets expectations, points to dashboard or checkout.

## Auth model

- `/` — public, no guard. Logged-in members may optionally redirect to `/dashboard` (decision: keep `/` public to allow members to share + screenshot the landing).
- `/welcome` — `requireAuthenticated`. Lands here once after signup; subsequent visits redirect to `/dashboard`.

## Data dependencies

- Founding-member count (server-side aggregate over `members` filtered by `created_at` < cutoff).
- `tiers` constants.

## Error contract

- Founding-member count query failure → render with placeholder count + Sentry log. Page never errors hard — it's the conversion surface.

## Test bar

- Unit: tier-card rendering, founding-member cutoff logic.
- Smoke: public path — `/` returns 200, both tier cards visible, primary CTA links to `/signup`.

## Deploy notes

- Copy changes need brand-voice review (Aaron / `aaron-brand-system-form.html` in the Outerfields parent project).
- Founding-member urgency block can be feature-flagged on/off without redeploy via a kv-backed flag (future PR).
