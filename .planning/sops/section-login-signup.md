# SOP — `routes/login`, `routes/signup`

## Purpose

Clerk-hosted auth surfaces, mounted via catch-all `[...rest]` so Clerk's component owns the full flow.

## Auth model

Unauthenticated by design. If a logged-in user hits `/login` → redirect to `/dashboard`. Same for `/signup` unless `?force=1`.

## Data dependencies

- Clerk publishable + secret keys.
- `CLERK_WEBHOOK_SIGNING_SECRET` — for downstream member upsert via `api/clerk/webhook`.

## Error contract

- Clerk component renders its own errors.
- Post-signup, before first `user.created` webhook lands, member sees a "Setting up your account…" interstitial (10s timeout → manual fallback).

## Test bar

- Unit: `redirects.test.ts` (existing).
- Smoke: public path — `/login` renders Clerk widget; `/signup` renders Clerk widget. Auth-gated — logged-in member hitting `/login` lands on `/dashboard`.

## Deploy notes

- Clerk version upgrades require a manual sign-in / sign-up flow walkthrough before merge.
- Dummy publishable key in CI (`pk_test_Y2xlcmsuZXhhbXBsZS5kZXYk`) keeps builds passing without real creds.
