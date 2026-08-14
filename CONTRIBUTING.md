# Contributing to ShivWorks Network

## Branch naming

| Prefix   | When to use                      |
| -------- | -------------------------------- |
| `feat/`  | New features                     |
| `fix/`   | Bug fixes                        |
| `chore/` | Dependency bumps, config changes |
| `docs/`  | Documentation only               |
| `ci/`    | CI/workflow changes              |

Examples: `feat/wc-webhook`, `fix/session-expiry`, `chore/deps-may`.

## PR checklist

Before opening a pull request, confirm:

1. **`pnpm check`** — no TypeScript errors
2. **`pnpm lint`** — no ESLint violations
3. **`pnpm format`** — code is formatted (or run `pnpm format` to fix)
4. **`pnpm test`** — all Vitest unit tests pass
5. **Migrations** — if you added a migration file, note it in the PR description
6. **Secrets** — no API keys, tokens, or credentials appear in source files
7. **`.env.example`** — any new environment variables are documented there

## Local development

```bash
pnpm install
pnpm exec wrangler d1 migrations apply shivworks-network-db --local   # or: pnpm migrate:local
pnpm dev                                                              # http://localhost:5173
```

A fresh clone needs the migration step. Without it every request fails with
`D1_ERROR: no such table: …` — the local database file exists but has no schema.

**Why `pnpm dev` needs a separate platform config.** The Cloudflare adapter injects
`wrangler.jsonc` `vars` into `platform.env` during local dev, and `resolveRuntimeEnv()`
lets `platform.env` **overwrite** `process.env`. So anything declared in `wrangler.jsonc`
cannot be changed from a shell variable or `.env`. Two things break as a result:

| Symptom                                                                         | Cause                                                                      |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Every route returns `503 Service temporarily unavailable (configuration error)` | `ENVIRONMENT=production` engages the production guard in `hooks.server.ts` |
| `Invalid JWT Authorized party claim (azp) "http://localhost:5173"`              | Only production hostnames are in Clerk's `authorizedParties`               |

`pnpm dev` therefore points the adapter at **`wrangler.local.jsonc`**, which sets
`ENVIRONMENT=development` and puts localhost in both `PUBLIC_SITE_URL` and
`CLERK_AUTHORIZED_PARTIES`. This is detected in `svelte.config.js` via
`SHIVWORKS_LOCAL_DEV=1` **or** `dev` appearing in argv, so it also works in shells where
the inline `VAR=1 cmd` syntax does not set variables (Windows).

Builds and deploys are unaffected — `vite build` matches neither condition and uses
`wrangler.jsonc`. Use `pnpm dev:prod-config` if you deliberately want production platform
vars locally.

**Signing in locally** requires your own Clerk **development** application — never
production keys. Put its two keys in `.env` (gitignored), noting that Clerk's dashboard
shows Next.js variable names by default and SvelteKit drops the `NEXT_` prefix:

```
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
```

Then sign up at `/signup` — the first login creates your member row — and grant yourself
access:

```bash
node scripts/grant-local-admin.mjs you@example.com
node scripts/set-local-access.mjs active you@example.com
```

## Database migrations

- Migration files live in `migrations/` and are numbered sequentially: `0001_`, `0002_`, etc.
- Always use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- Never modify an existing migration file — add a new one.
- `pnpm migrate:local` applies migrations to your local database.
- ⚠️ `pnpm migrate` targets `--remote`, i.e. **production**. Check which one you mean.

## Replit development environment (w453)

Replit is used for product editing, previewing, and client-side iteration. The app runs in Node.js mode (not Cloudflare Workers) using `better-sqlite3` for a local D1-compatible database.

### First-time setup

1. In the Replit **Secrets** tab, add every variable from `.env.example`. Use dev/test keys (Clerk test app, Stripe test mode, etc.).
2. Run the dev server:
   ```bash
   pnpm install --frozen-lockfile=false
   pnpm dev -- --host 0.0.0.0 --port 3000
   ```
   The preview pane at port 3000 will show the running app.

### With Infisical (optional for maintainers)

If you have access to the Infisical workspace, you can inject secrets directly instead of entering them manually:

```bash
infisical login
infisical run --env=dev -- vite dev
# or use the npm script:
pnpm dev:secrets
```

### Runtime differences from production

| Feature      | Replit (dev)                                     | Cloudflare Pages (prod)           |
| ------------ | ------------------------------------------------ | --------------------------------- |
| Database     | `better-sqlite3` (local file)                    | Cloudflare D1                     |
| KV cache     | Not wired (`kv-cache.ts` falls through to D1)    | CF KV namespace                   |
| Environment  | `ENVIRONMENT=development`                        | `ENVIRONMENT=production`          |
| Auth origins | Replit preview URL in `CLERK_AUTHORIZED_PARTIES` | `https://theshivworksnetwork.com` |

`wrangler.replit.jsonc` documents any Replit-specific binding overrides. Do not use Replit as a production host or point it at the production D1 database.

---

## Infisical secrets management (w452)

All production secrets live in the Infisical vault under three environments: `dev`, `staging`, `prod`.

- The `prod` environment syncs automatically to Cloudflare Pages via the Infisical → CF Pages integration.
- Never paste secrets directly into the CF Pages dashboard — always update them in Infisical and let the sync propagate.
- To add a new secret: add it to `.env.example` (with a placeholder), then set it in all three Infisical environments.

### Infisical workspace init (one-time, maintainers)

```bash
infisical login
infisical init   # writes real workspaceId to .infisical.json
```

See `docs/prod-ops-runbook.md` for the full secret inventory.

---

## Staging environment & smoke discipline (w454)

### Branch → environment mapping

| Branch                 | CF Pages environment | Infisical env | D1 database                                   |
| ---------------------- | -------------------- | ------------- | --------------------------------------------- |
| `main`                 | Production           | `prod`        | `shivworks-network-db` (production)           |
| `staging`              | Preview              | `staging`     | `shivworks-network-db` preview (`26dd5a78-…`) |
| Any `feat/*` / `fix/*` | Preview              | `staging`     | preview DB                                    |

### Staging deployment

```bash
git checkout staging
pnpm deploy:staging
```

This pushes to the `staging` branch, which CF Pages deploys to a preview URL.

### Smoke discipline rule

**No PR merges to `main` without passing the Artillery smoke test against the staging URL.**

This is enforced by the `.github/workflows/staging-smoke.yml` GitHub Actions job, which runs on every PR targeting `main`. Once `STAGING_URL` is added as a GitHub Actions repo secret (see step below), the gate blocks merges automatically.

To run it locally:

```bash
TARGET_URL=<staging-preview-url> pnpm load:base
```

Pass criteria: < 2% error rate, p95 < 3 s. Record the result in the PR description before merging.

### Enable the automated smoke gate

1. Get the CF Pages staging preview URL (shown after `pnpm deploy:staging`).
2. GitHub repo → Settings → Secrets and variables → Actions → New repository secret.
3. Name: `STAGING_URL`, Value: `https://<hash>.shivworks-network.pages.dev`.
4. The `Staging Smoke` CI job will now run live Artillery against staging on every PR to `main`.

---

## Environment variables

- All runtime secrets are managed via Infisical (production) and Replit secrets (dev preview).
- Never hardcode secrets. Use `resolveRuntimeEnv` from `$lib/server/env` to read them.
- Document new variables in `.env.example` with a comment explaining the purpose.

## Code style

- TypeScript everywhere; no `any` except where unavoidable and commented.
- SvelteKit conventions: server logic in `+page.server.ts`, UI in `+page.svelte`.
- Errors are surfaced via `logError` from `$lib/server/log`, not bare `console.error`.
- All inbound webhook handlers must be idempotent via `processed_webhook_events`.

## Testing

- Unit tests live alongside the file they test (`foo.ts` → `foo.test.ts`).
- E2E smoke tests live in `tests/e2e/` and run with Playwright.
- Auth-gated E2E tests require Clerk test users (see w428 for setup).

---

## Launch runbook

See [`.planning/ROLLOUT.md`](.planning/ROLLOUT.md) for the staged rollout cadence, metric thresholds, CF Pages rollback procedure, and D1 restore steps.

See [`docs/prod-ops-runbook.md`](docs/prod-ops-runbook.md) for production secrets rotation and Resend DNS/deliverability setup.
