# SOP — `routes/community`

## Purpose

Single landing surface that points members at the Circle community (the actual community lives in Circle, not in this app). Long-term: deeper Circle SSO + activity preview.

## Auth model

`requirePaidMember` — Bronze and VIP only. Free tier sees an upsell.

## Data dependencies

- `PUBLIC_CIRCLE_COMMUNITY_URL` env var.
- Future: Circle API for member activity preview.

## Error contract

- `PUBLIC_CIRCLE_COMMUNITY_URL` unset → render maintenance message, log `INTERNAL_ERROR` to Sentry.
- Circle outage detection (future) → soft banner, do not block page.

## Test bar

- Unit: redirect / link rendering based on tier.
- Smoke: auth-gated — paid member sees the Circle CTA; free member sees the upsell.

## Deploy notes

- No DB changes.
- Coordinate any Circle URL change with Aaron before merge.
