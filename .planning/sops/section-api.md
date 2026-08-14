# SOP — `routes/api`

## Purpose

All server endpoints: webhooks (Stripe, Clerk, Stream), member-facing mutations (progress, RSVP, VIP request), admin actions, settings.

## Subtree

```
api/admin/media/uploads/{init,complete,sync}
api/clerk/webhook
api/events/[id]/rsvp
api/library/episodes/[episodeId]/{playback,progress}
api/library/modules/[moduleId]/progress
api/settings/sessions/[sessionId]/revoke
api/stripe/{checkout,webhook}
api/vip-calls/request
api/webhooks/stream
```

## Auth model

| Endpoint class                                                            | Guard                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Public webhooks (`/stripe/webhook`, `/clerk/webhook`, `/webhooks/stream`) | signature verify (HMAC / svix) — **no Clerk auth**   |
| `api/admin/**`                                                            | `requireAdmin`                                       |
| `api/library/**`, `api/events/**`, `api/settings/**`, `api/vip-calls/**`  | `requireAuthenticated`, then tier guard per resource |
| `api/stripe/checkout`                                                     | `requireAuthenticated`                               |

## Response contract

All endpoints return JSON. Success: `{ success: true, ...payload }`. Failure: `{ error: { code, message, eventId? } }` per Spec 03 §3 taxonomy.

## Required for every POST/PUT/DELETE

1. zod schema validation of body.
2. Content-Length pre-check (reject > 100 KB unless explicitly larger).
3. Rate-limit decorator (per Spec 02 §6).
4. `logError` on any caught exception with `scope: 'api.<path>'`.

## Webhooks specifically

- Replay protection via `processed_webhook_events` (Spec 02 §2).
- Always return 2xx on already-processed events (not 4xx) — vendors retry on non-2xx.
- Never log full payload at info level (PII risk); log event id + type + outcome.

## Test bar

- Unit: per endpoint — happy path, auth failure (401/403), validation failure (400), upstream failure (502).
- Smoke: spot-check `/api/stripe/webhook` via Stripe CLI signature in a dedicated test workflow (not regular smoke; runs nightly).

## Deploy notes

- New endpoints require a CODEOWNERS reviewer on `src/lib/server/`.
- New webhook endpoint requires `processed_webhook_events` entry — non-negotiable.
