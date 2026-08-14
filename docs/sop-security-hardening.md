# SOP: Security Hardening Checklist

Every new endpoint or webhook handler must pass this checklist before the PR is merged. Work through each item top-to-bottom; do not skip items because "it's internal" or "low risk."

## Checklist

### (a) Request body validated

All user-supplied or external-party input must be validated before use.

**Until `w427` ships (Zod integration):** use a hand-rolled validator that checks shape, types, and required fields before touching any of the values. Return `400` for malformed input.

```typescript
// Pattern from src/lib/server/wc-webhook.ts
function parseWcOrder(raw: unknown): WcOrder | null {
  if (!isRecord(raw)) return null;
  const id = num(raw.id);
  const status = str(raw.status);
  // ... type-safe extraction of every field before use
  if (id === null || !status) return null;
  return { id, status, ... };
}
```

**After `w427` ships:** wrap the request body with the appropriate Zod schema at the top of the handler. Never access `body.field` without validating the schema first.

### (b) Authentication guard applied

Choose the correct guard from `src/lib/server/guards.ts`:

| Guard | When to use |
|-------|-------------|
| `requireAuthenticated(locals)` | Route requires sign-in, any tier |
| `requireEntitled(locals)` | Route requires active (paid or free) access status |
| `requirePaidMember(locals)` | Route requires Bronze or VIP tier |
| `requireVip(locals)` | Route requires VIP tier |
| `requireAdmin(locals)` | Route is admin-only |

```typescript
// In +page.server.ts load or +server.ts handler
import { requirePaidMember } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requirePaidMember(locals);
  // ... rest of load
};
```

Public API endpoints (e.g., `GET /api/members`) do not need a guard, but must not expose non-public data.

Webhook endpoints (`/api/wc/webhook`, `/api/stripe/webhook`, `/api/clerk/webhook`) do not use Clerk authentication — they authenticate via signature verification (see item c).

### (c) Webhook signature verified before any DB read

Webhook handlers must verify the inbound HMAC signature on the raw request body **before** parsing the payload or touching the database. A failed signature check returns `401` immediately.

```typescript
// Pattern from src/routes/api/wc/webhook/+server.ts
const rawBody = await request.text();                          // read raw bytes first
const signature = request.headers.get('x-wc-webhook-signature');
const valid = await verifyWcSignature(rawBody, signature, secret);
if (!valid) {
  logError('wc.webhook.verify', new Error('invalid signature'));
  return json({ success: false, error: 'invalid signature' }, { status: 401 });
}
// Only parse + DB access after this point
const parsed = JSON.parse(rawBody);
```

**Never** parse the body before verifying the signature — doing so allows an attacker to send arbitrary JSON that passes shape-validation before the HMAC check.

### (d) Idempotency key claimed before any write

Any webhook handler or operation that could be replayed must claim an idempotency key before writing to the database. Use `claimWebhookEvent` from `src/lib/server/webhook-idempotency.ts`.

```typescript
import { claimWebhookEvent } from '$lib/server/webhook-idempotency';

const claim = await claimWebhookEvent(db, 'wc', String(order.id), `tier=${tier}`);
if (!claim.fresh) {
  // Already processed — 200 no-op so the sender stops retrying
  return json({ success: true, replayed: true, orderId: order.id });
}
// DB writes happen only here, after the claim
```

The `processed_webhook_events` table uses a `(source, event_id)` primary key. Two simultaneous requests for the same event race to the INSERT; exactly one wins. The loser returns `200` with `replayed: true`.

**Do not release the idempotency claim** if the write fails. It is better to lose one record than to double-provision on retry. Fix the record by hand via the admin panel.

### (e) No secret values logged or returned

Secrets, tokens, and credentials must never appear in:

- Log output (including `logError` context)
- Response bodies (including error responses)
- Sentry breadcrumbs or exception extras

```typescript
// Bad — logs the raw secret
logError('webhook.config', new Error('bad secret'), { secret: runtimeEnv.WC_WEBHOOK_SECRET });

// Good — log the label, not the value
logError('webhook.config', new Error('WC_WEBHOOK_SECRET is not set'));
```

If you need to confirm a key is present without logging it:

```typescript
const hasKey = Boolean(runtimeEnv.SOME_SECRET);
logError('service.config', new Error('API key missing'), { hasKey });
```

### (f) Rate-limit applied to user-triggered endpoints

Any endpoint a signed-in user can call directly (e.g., a form submission, an API action) must call `checkRateLimit` from `src/lib/server/rate-limit.ts` before doing any work. Return `429` if the check fails.

```typescript
import { checkRateLimit } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  const user = requireAuthenticated(locals);
  const { db } = platform!.env;

  const rl = await checkRateLimit(db, user.userId, 'vip-calls.request', {
    windowSeconds: 3600,   // 1 hour
    maxRequests:  3        // 3 requests per hour per user
  });
  if (!rl.allowed) {
    return json(
      { success: false, error: 'rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  // ... handler logic
};
```

Annotate the PR description with:
- `windowSeconds` and `maxRequests` values chosen and why
- Whether this is a financial operation (checkout, subscription change) — these require lower limits (`maxRequests: 1` per window is appropriate)
- What a `429` looks like to the end-user

Webhook endpoints are rate-limited by the sender (WooCommerce, Stripe) and do not need this annotation.

## Additional rules

### Config check at startup

If an endpoint requires a secret, check for it at the top of the handler and return `500` with a generic message if it is missing — do not let the handler proceed with a `null` or `undefined` secret:

```typescript
const secret = runtimeEnv.WC_WEBHOOK_SECRET;
if (!secret) {
  logError('wc.webhook.config', new Error('WC_WEBHOOK_SECRET is not set'));
  return json({ success: false, error: 'webhook not configured' }, { status: 500 });
}
```

### CORS

Endpoints that allow cross-origin access must explicitly set `Access-Control-Allow-Origin` to the minimum required origin. Never use `*` on authenticated or write endpoints. Always handle the `OPTIONS` preflight.

### SQL injection

All database queries use the `D1Compat` `prepare().bind()` pattern — parameterised queries only. Never concatenate user input into a SQL string.
