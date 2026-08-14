# SOP — `routes/vip-calls`

## Purpose

VIP-tier 1:1 booking surface. Member submits a request; staff schedules externally; confirmation email sent via Resend.

## Auth model

`requireVip` — fails 403 for non-VIP. Bronze sees an upsell page instead (consider a `/vip-calls/upgrade` sibling route in a future PR).

## Data dependencies

- Planned `vip_call_requests` table (verify in impl).
- `email/templates/vip-booking.ts`.
- `api/vip-calls/request/+server.ts`.

## Error contract

- Submit failure → form preserves user input + shows "Try again" + event ID.
- Email send failure → request still persisted; staff reconciles manually. Background log to Sentry as `UPSTREAM_FAILURE scope=resend`.

## Test bar

- Unit: request handler — auth, validation, persistence, email dispatch.
- Smoke: auth-gated — VIP test user sees the request form; non-VIP test user gets the 403 boundary.

## Deploy notes

- This is a member-facing mutation endpoint with abuse potential. Rate limit applies (Spec 02 §6) — 5/day/user is the proposed cap. Confirm with Aaron before enforcing.
