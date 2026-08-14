# Spec 03 — Error Handling

Goal: every error is captured, classified, and either surfaced gracefully to the user or alerted on. No more silent `console.error`.

---

## §1 Sentry SDK wiring

> **DSN** = "Data Source Name" — the project key Sentry gives you when you create the project. Looks like `https://abc123@o0.ingest.sentry.io/1234567`. Paste into Doppler as `PUBLIC_SENTRY_DSN`. Nothing is sent until that value is set.

### Install

```
pnpm add @sentry/sveltekit
```

### `src/hooks.client.ts` (new file)

```ts
import * as Sentry from '@sentry/sveltekit';
import { PUBLIC_SENTRY_DSN, PUBLIC_SENTRY_ENV } from '$env/static/public';

if (PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: PUBLIC_SENTRY_DSN,
    environment: PUBLIC_SENTRY_ENV || 'development',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })]
  });
}

export const handleError = Sentry.handleErrorWithSentry(({ error, event }) => {
  console.error('client error', { url: event.url.pathname, error });
  return { message: 'Something went wrong on our end.', code: 'CLIENT_ERROR' };
});
```

### `src/hooks.server.ts` (extend existing)

- Wrap the exported `handle` with `Sentry.sentryHandle()` via `sequence`.
- Add an exported `handleError` that reports to Sentry, scrubs PII, returns a safe shape.
- Tag every Sentry event with `clerkUserId` (if hydrated), route id, and `runtimeEnv.ENVIRONMENT`.

### Env vars

- `PUBLIC_SENTRY_DSN` — public, safe to embed.
- `PUBLIC_SENTRY_ENV` — `production` / `preview` / `development`.
- `SENTRY_AUTH_TOKEN` — CI-only, used by the Sentry vite plugin to upload sourcemaps. Org-level token, scope `project:releases`.

### Sourcemaps

Add `@sentry/vite-plugin` to `vite.config.ts`. Upload on `pnpm build` when `SENTRY_AUTH_TOKEN` is set; no-op locally.

### Acceptance

- With DSN unset, `pnpm build && pnpm preview` runs with **zero** network traffic to Sentry.
- With DSN set, a hand-thrown error in `/dashboard` shows in Sentry within 30s, tagged with `route=/dashboard` and `clerkUserId`.

## §2 `+error.svelte` boundaries

SvelteKit error boundaries are hierarchical — the nearest `+error.svelte` to a thrown route catches.

| Boundary file                        | Catches errors from                                 |
| ------------------------------------ | --------------------------------------------------- |
| `src/routes/+error.svelte`           | everything not caught deeper (root fallback)        |
| `src/routes/(authed)/+error.svelte`  | authed surfaces if/when route group introduced      |
| `src/routes/dashboard/+error.svelte` | dashboard load + render                             |
| `src/routes/checkout/+error.svelte`  | checkout (revenue path — needs a soft-recovery CTA) |
| `src/routes/library/+error.svelte`   | library + episode pages                             |
| `src/routes/community/+error.svelte` | Circle integration                                  |
| `src/routes/vip-calls/+error.svelte` | booking flow                                        |
| `src/routes/admin/+error.svelte`     | admin tools (show stack to admins only)             |

Each boundary:

- Reads `$page.error.code` and `$page.status`.
- Renders a contextual message + a primary CTA back to a known-good route.
- Hides stack from non-admin viewers.
- Surfaces a "Report ID" (Sentry event ID via `Sentry.lastEventId()`).

Checkout boundary additionally shows: "Your payment was not charged. Try again or contact support@…"

## §3 Server-side `handleError` + error taxonomy

`src/hooks.server.ts` exports `handleError`:

```ts
export const handleError: HandleServerError = async ({ error, event, status, message }) => {
  const eventId = Sentry.captureException(error, {
    user: event.locals.user ? { id: event.locals.user.clerkUserId } : undefined,
    tags: { route: event.route.id ?? 'unknown', status: String(status) }
  });
  return {
    message: status < 500 ? message : 'An unexpected error occurred.',
    code: classify(error),
    eventId
  };
};
```

### Error code taxonomy

| Code               | When                                                                                  | HTTP |
| ------------------ | ------------------------------------------------------------------------------------- | ---- |
| `AUTH_REQUIRED`    | thrown by `requireAuthenticated` (already redirects, here for explicit API responses) | 401  |
| `AUTH_FORBIDDEN`   | role/tier check fails                                                                 | 403  |
| `NOT_FOUND`        | resource missing                                                                      | 404  |
| `INVALID_INPUT`    | zod validation failure                                                                | 400  |
| `RATE_LIMITED`     | rate limiter hit                                                                      | 429  |
| `PAYMENT_REQUIRED` | entitlement gate triggered                                                            | 402  |
| `UPSTREAM_FAILURE` | Stripe/Clerk/Resend/Stream call failed                                                | 502  |
| `INTERNAL_ERROR`   | uncaught                                                                              | 500  |

API endpoints return: `{ error: { code, message, eventId? } }` — never raw error text.

## §4 Structured server logging

Replace `console.error('Stripe webhook verification failed', error)` with a small `log.ts` helper:

```ts
export function logError(scope: string, err: unknown, ctx?: Record<string, unknown>) {
  const payload = { scope, message: err instanceof Error ? err.message : String(err), ...ctx };
  console.error(JSON.stringify(payload)); // Cloudflare collects stderr lines
  Sentry.captureException(err, { tags: { scope }, extra: ctx });
}
```

Migrate all 11 `console.error` call sites to `logError`.

## §5 `hooks.server.ts` silent-swallow fix

Current code:

```ts
} catch (error) {
  console.error('Failed to hydrate authenticated ShivWorks member', error);
}
```

Replace with `logError('hooks.member-hydrate', error, { clerkUserId: auth.userId })` so it (a) hits Sentry and (b) is searchable in CF logs. Keep the swallow — request continues with `event.locals.user = null` so the user lands on `/checkout` instead of hard-failing — but the incident is now visible.

## §6 Alerting

In Sentry:

- Alert on **any** `INTERNAL_ERROR` in production (slack channel).
- Alert on > 5 `UPSTREAM_FAILURE` / 5 min (rolling).
- Alert on > 1 `RATE_LIMITED` from a single `clerkUserId` in 1 min (possible abuse).

Wire via Sentry UI; no repo config required. Documented in `sops/00-pull-requests.md` § Post-Merge.

## §7 Acceptance — end-to-end

1. Throw a synthetic 500 from `/dashboard` server load → boundary renders, Sentry receives, member sees "Something went wrong" with event ID.
2. POST `/api/vip-calls/request` with empty body → 400 `{ error: { code: 'INVALID_INPUT' } }`, no Sentry event (it's user error).
3. Force Stripe webhook signature failure → 400, Sentry event tagged `scope=stripe.webhook`.
