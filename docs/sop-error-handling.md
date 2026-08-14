# SOP: Error Handling

This document covers the error handling patterns in the ShivWorks Network codebase. Follow these conventions whenever you add a server route, webhook handler, or background operation.

## Error boundary locations

Seven `+error.svelte` files cover every protected route. Each renders a contextual error page using the ShivWorks design system:

| File | Covers | Notes |
|------|--------|-------|
| `src/routes/+error.svelte` | Root / catch-all | Generic 404, 403, 500 copy |
| `src/routes/dashboard/+error.svelte` | Dashboard | Auth expiry copy + sign-in CTA |
| `src/routes/library/+error.svelte` | Library index | 403 → upgrade CTA |
| `src/routes/library/[slug]/+error.svelte` | Course detail | 403 → upgrade CTA, 404 → back to library |
| `src/routes/checkout/+error.svelte` | Checkout | Payment-specific copy + refund contact |
| `src/routes/admin/+error.svelte` | Admin panel | Admin-privilege messaging |
| `src/routes/settings/+error.svelte` | Settings | Auth-required copy |

SvelteKit renders the nearest ancestor `+error.svelte` when a `+page.server.ts` or `+layout.server.ts` throws an `error()` or unhandled exception. The `$page.status` and `$page.error.message` values drive the copy.

**Rule:** never throw raw `Error` objects from route load functions. Always use SvelteKit's `error(statusCode, 'message')` helper so the boundary can display a useful status.

```typescript
import { error } from '@sveltejs/kit';

// Good
error(403, 'Upgrade required to access this course.');

// Bad — renders as a generic 500 with no useful message
throw new Error('not allowed');
```

## Error taxonomy — HTTP status codes and boundary copy

The `+error.svelte` boundaries receive `$page.status` (the HTTP status code) and `$page.error.message` (the string passed to SvelteKit's `error()` helper). Use the HTTP status code as the canonical error classification — it is the most reliable signal and drives both the boundary copy and any analytics events.

**Standard status codes used in this codebase:**

| Status | Semantic | When to throw |
|--------|----------|---------------|
| 400 | Invalid input | Malformed request body fails validation |
| 401 | Auth required | No valid Clerk session; call `requireAuthenticated` |
| 402 | Payment required | Feature gated to paid members; call `requirePaidMember` |
| 403 | Forbidden | Session valid but insufficient tier; call `requireEntitled` / `requireVip` / `requireAdmin` |
| 404 | Not found | Resource does not exist or was deleted |
| 422 | Unprocessable | Request shape valid but content rejected (e.g., duplicate RSVP) |
| 429 | Rate limited | `checkRateLimit` denied the request |
| 500 | Internal error | Unexpected server failure — let it propagate to Sentry |
| 502 / 503 | Upstream failure | Stripe / Clerk / Resend / Stream returned a non-2xx error |

**Boundary copy convention** — each `+error.svelte` switches on `$page.status` to render contextual copy. Keep the pattern consistent:

```svelte
<!-- Example from src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
</script>

{#if $page.status === 401}
  <p>Please sign in to continue.</p>
{:else if $page.status === 403}
  <p>You don't have access to this.</p>
{:else if $page.status === 404}
  <p>We couldn't find that.</p>
{:else}
  <p>Something went wrong ({$page.status}).</p>
{/if}
```

**Rule:** never expose `$page.error?.message` directly in production UI — SvelteKit sanitises it in production mode, but do not rely on that. Write explicit copy for each status class your boundary handles.

## `logError` — structured error logging

**Location:** `src/lib/server/log.ts`

```typescript
export function logError(
  label: string,
  error: unknown,
  context?: Record<string, unknown>
): void
```

Use `logError` for any explicitly named error path in server code — webhook handlers, background operations, API routes. Sentry's `handleErrorWithSentry` in `hooks.server.ts` captures unhandled exceptions automatically; `logError` is for errors you catch and handle without re-throwing.

### Namespacing convention

The `label` argument is a dot-separated namespace that identifies the site of the error. Use the format `<domain>.<operation>.<detail>`:

```typescript
// Webhook handler
logError('wc.webhook.signature', err);
logError('wc.webhook.provision', err, { orderId: order.id, email });
logError('wc.webhook.email', err, { orderId: order.id });

// API route
logError('api.members.query', err);

// ActiveCampaign integration
logError('activecampaign.sync', err, { email });
logError('activecampaign.tag.missing', err, { tag: tagName });

// Video / Stream
logError('stream.token.sign', err, { assetId });
```

Keep labels consistent. If a domain has multiple operations, share the prefix (e.g., `wc.webhook.*`).

### Context object

Pass structured context as the third argument when it helps triage the error without exposing sensitive data:

```typescript
// Good — order ID and tier help identify the bad record
logError('wc.webhook.provision', err, { orderId: order.id, tier });

// Bad — email in context is fine for internal logs, but never log payment card data,
// Clerk session tokens, or webhook secret values
```

### When to use `logError` vs. re-throw

| Situation | Pattern |
|-----------|---------|
| Error is expected and handled (e.g., network timeout on non-critical side-effect) | `logError(...)` and continue |
| Error means the core operation failed (e.g., DB write) | `logError(...)` then `return json({ error: '...' }, { status: 500 })` |
| Error is unexpected and should alert (e.g., bad config) | Let it propagate — Sentry captures it |
| Webhook side-effects (email, AC tag) | `logError(...)` and continue — the provision already succeeded |

## User-facing error messages

**Rule:** user-facing messages must never expose internal details.

```typescript
// Good — generic message that does not reveal implementation
return json({ success: false, error: 'provision failed' }, { status: 500 });

// Bad — leaks internal structure
return json({ success: false, error: err.message }, { status: 500 });
```

In `+error.svelte` files, `$page.error?.message` is rendered only because SvelteKit sanitises error messages in production mode. Do not embed SQL fragments, stack traces, or secret-adjacent values in error messages thrown from server routes.

## Zod schema validation (w427+)

Request body validation uses Zod schemas from `src/lib/server/schemas/`. Each module has its own schema file:

| Schema file | Validates |
|-------------|-----------|
| `schemas/clerk-webhook.ts` | Clerk webhook `user.created` / `session.removed` payload |
| `schemas/stripe-webhook.ts` | Stripe webhook `checkout.session.completed` shape |
| `schemas/stripe-checkout.ts` | POST body for `/api/stripe/checkout` |
| `schemas/wc-order.ts` | WooCommerce order webhook payload |
| `schemas/rsvp.ts` | POST body for `/api/events/[id]/rsvp` |
| `schemas/episode-progress.ts` | POST body for episode progress tracking |
| `schemas/module-progress.ts` | POST body for module progress tracking |
| `schemas/session-revoke.ts` | POST body for session revocation |
| `schemas/vip-call-request.ts` | POST body for VIP call booking |
| `schemas/admin-upload.ts` | POST body for admin media upload |

The `src/lib/server/schemas/index.ts` barrel re-exports all schemas. Import from there:

```typescript
import { RsvpSchema } from '$lib/server/schemas';

const parsed = RsvpSchema.safeParse(await request.json());
if (!parsed.success) {
  return json({ success: false, error: 'invalid request' }, { status: 400 });
}
const { eventId, attending } = parsed.data;
```

## Non-fatal side effects

The webhook pipeline treats email and ActiveCampaign tagging as non-fatal:

```typescript
try {
  await sendWelcomeEmail(runtimeEnv, { email, name, tier });
} catch (error) {
  logError('wc.webhook.email', error, { orderId: order.id });
  // Email failure is non-fatal — the membership is provisioned.
}
```

Apply the same pattern for any side effect that does not invalidate the core operation. Log the error, note why it is non-fatal in a comment, and continue.
