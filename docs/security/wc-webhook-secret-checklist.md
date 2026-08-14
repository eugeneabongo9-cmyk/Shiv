# WooCommerce Webhook Secret — Deployment Checklist

Use this before every production deploy that touches payment webhooks.

## Generate a strong secret

1. Generate at least 32 random bytes (WC accepts long shared secrets):

   ```bash
   openssl rand -base64 32
   ```

2. Do **not** use words like `test`, `changeme`, `placeholder`, `example`, or `sample`.

## Store the secret

| Environment       | Where to set                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production        | Cloudflare Pages → Settings → Environment variables → **Production** → `WC_WEBHOOK_SECRET` (encrypted)                                                        |
| Preview / staging | Set `ENVIRONMENT=preview` (or `staging`) in Cloudflare **Preview** env vars so startup guard stays lenient; still set `WC_WEBHOOK_SECRET` if testing webhooks |
| Local dev         | `.env.local` (never commit)                                                                                                                                   |

## Configure WooCommerce

1. WP Admin → WooCommerce → Settings → Advanced → Webhooks
2. Edit the ShivWorks Network delivery URL webhook
3. Set **Secret** to the **exact same value** as `WC_WEBHOOK_SECRET`
4. Save and send a test delivery after deploy

## Pre-deploy validation

```bash
# From repo root — fails loudly on weak/missing secrets
ENVIRONMENT=production WC_WEBHOOK_SECRET="<your-secret>" node scripts/validate-production-env.mjs
```

Or run unit tests:

```bash
pnpm test src/lib/server/env-validation.test.ts
```

## Post-deploy verification

- [ ] Site loads (no 503 `configuration error` from startup guard)
- [ ] `POST /api/wc/webhook` returns **401** with bad signature (proves handler is live)
- [ ] Signed test webhook returns **200** (`pnpm tsx scripts/test-wc-webhook.ts …`)
- [ ] `/admin/webhooks` shows the event after a test order

## Automatic rejection rules (production)

The app blocks startup and webhook processing when `WC_WEBHOOK_SECRET` is:

- missing, empty, `null`, or whitespace-only
- exact placeholder: `changeme`, `placeholder`, `test`, `development`, `example`, `sample`, `replace_me`, `xxx`, …
- contains placeholder fragments: `changeme`, `placeholder`, `replace_me`, …
- uses dev/test prefixes or suffixes: `test-…`, `…-sample`, etc.
- shorter than **16 characters**
- repeated single character (e.g. `aaaaaaaaaaaaaaaa`)

## Rollback

If a bad secret is deployed:

1. Set a valid `WC_WEBHOOK_SECRET` in Cloudflare Pages Production env
2. Redeploy (or wait for env var propagation)
3. Update matching secret in WooCommerce webhook settings
4. Replay failed events from `/admin/webhooks` if needed

## CI note

GitHub Actions CI uses dummy Clerk keys only. `WC_WEBHOOK_SECRET` is **not** required in CI unless running WC e2e tests (those skip when unset).
