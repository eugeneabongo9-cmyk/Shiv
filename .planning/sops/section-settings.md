# SOP — `routes/settings`

## Purpose

Account management. Sub-routes: profile (Clerk), notification preferences, active sessions, billing portal link.

## Subtree

- `settings/[...rest]` — Clerk user component
- `settings/sessions/+page` — list active sessions
- `api/settings/sessions/[sessionId]/revoke` — revoke endpoint

## Auth model

`requireAuthenticated` everywhere.

## Data dependencies

- `member_notification_preferences` table.
- Clerk Sessions API.

## Error contract

- Revoke failure → toast "Couldn't revoke session, try again", do not error the page.
- Notification preference save failure → optimistic UI rolls back; toast + Sentry.

## Test bar

- Unit: session-revoke handler (auth + ownership check — only own sessions revokable).
- Smoke: auth-gated — open `/settings/sessions`, assert at least one row (current session) is listed.

## Deploy notes

- Session-security defaults (limit per tier) live in `src/lib/server/session-security.ts`. Change requires a security review per Spec 02 §3.
