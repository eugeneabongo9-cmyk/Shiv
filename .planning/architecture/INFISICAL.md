# Infisical — secrets management

**Why Infisical.** Every credential the app needs at build or runtime — Clerk keys, Stripe/WC webhook secrets, Resend API key, Cloudflare Stream tokens, Sentry DSN, the future WC webhook secret — lives in Infisical, not in `.env` files and not in raw Cloudflare environment variables. One vault, three environments (`dev`, `staging`, `prod`), audit log, granular access. Per the original runbook.

**What is NOT Infisical.** Doppler is _not_ used (an earlier doc said it was; that was a mistake). Raw CF Pages env vars are _not_ used as a parallel source — anything in CF should be there because Infisical's CF integration synced it, not because a human pasted it in.

---

## One-time setup (per developer)

### 1. Install the CLI

| OS               | Command                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| macOS            | `brew install infisical/get-cli/infisical`                                                         |
| Windows (winget) | `winget install -e --id Infisical.Infisical`                                                       |
| Windows (scoop)  | `scoop bucket add org https://github.com/Infisical/scoop-infisical.git && scoop install infisical` |
| Linux (apt)      | `curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh'                                     | sudo -E bash && sudo apt-get install -y infisical` |
| Linux (rpm)      | `curl -1sLf 'https://artifacts-cli.infisical.com/setup.rpm.sh'                                     | sudo -E bash && sudo dnf install -y infisical`     |

Verify: `infisical --version`.

Full reference: https://infisical.com/docs/cli/usage

### 2. Authenticate

```bash
infisical login
```

Opens a browser for OAuth. Token cached locally in your OS keychain — no plain-text secrets.

### 3. Link this project to the workspace

```bash
infisical init
```

This writes `.infisical.json` with the `workspaceId` for the ShivWorks Network vault. **This repo already has a `.infisical.json` template** with `workspaceId: "REPLACE_ME_AFTER_INFISICAL_INIT"` — after running `infisical init` the real ID lands in place. Commit the updated file (it carries no secret material, just the workspace pointer).

---

## Daily usage

The pattern is **`infisical run --env=<env> -- <your command>`**. The CLI injects all secrets for that env as environment variables, then execs your command.

```bash
# local dev with dev-env secrets
pnpm dev:secrets        # = infisical run --env=dev -- pnpm dev

# build for production with prod secrets
pnpm build:secrets      # = infisical run --env=prod -- pnpm build

# run a D1 migration with prod secrets
pnpm run:secrets -- pnpm migrate

# arbitrary script
infisical run --env=dev -- node scripts/configure-stream-runtime.mjs
```

Equivalent npm scripts are wired in `package.json` (see the `*:secrets` family added by this PR).

### Working without the CLI

You can still run `pnpm dev` and `pnpm build` directly — the app reads secrets at runtime via `$env/dynamic/private`, and anything optional (Sentry, Stream, Resend) is gated and degrades gracefully. But authenticated flows (Clerk, payments, webhooks) will only work end-to-end with the secrets injected.

---

## CI / Cloudflare Pages

CI uses a **service token**, not a developer login. Steps:

1. In Infisical → Settings → Service Tokens, create a token scoped to the `prod` (and `staging`) env with read-only access.
2. Add it as a GitHub Actions secret named `INFISICAL_TOKEN`.
3. Add it as a Cloudflare Pages env var named `INFISICAL_TOKEN` on the `production` + `preview` environments.

In the CI job that needs secrets:

```yaml
- run: pnpm install --frozen-lockfile
- run: |
    curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | sudo -E bash
    sudo apt-get install -y infisical
- run: infisical run --token=${{ secrets.INFISICAL_TOKEN }} --env=prod -- pnpm build
```

For Cloudflare Pages, prefer the **Infisical → Cloudflare integration** (Settings → Integrations) which syncs secrets directly into the Pages project as env vars. That way the deployed Worker never invokes the CLI; it just reads `process.env.X` like normal. Use the CLI in CI only when running build commands that need the secrets injected before deploy.

---

## Secret inventory (names only, never values)

Names are public; values live in the vault. Cross-reference with `.env.example`.

| Name                               | Used by                                          | Env                               |
| ---------------------------------- | ------------------------------------------------ | --------------------------------- |
| `PUBLIC_CLERK_PUBLISHABLE_KEY`     | Clerk client                                     | dev/staging/prod                  |
| `CLERK_SECRET_KEY`                 | Clerk server                                     | dev/staging/prod                  |
| `CLERK_JWT_KEY`                    | Clerk session verify                             | dev/staging/prod                  |
| `CLERK_WEBHOOK_SIGNING_SECRET`     | `/api/clerk/webhook` svix verify                 | dev/staging/prod                  |
| `STRIPE_SECRET_KEY`                | Stripe API + webhook construct                   | dev/staging/prod (dormant target) |
| `STRIPE_WEBHOOK_SECRET`            | `/api/stripe/webhook` signature verify           | dev/staging/prod (dormant target) |
| `STRIPE_BRONZE_PRICE_ID`           | Checkout session creation                        | (dormant)                         |
| `STRIPE_VIP_PRICE_ID`              | Checkout session creation                        | (dormant)                         |
| `WC_WEBHOOK_SECRET`                | future `/api/wc/webhook` HMAC verify             | dev/staging/prod (to be added)    |
| `RESEND_API_KEY`                   | transactional email                              | dev/staging/prod                  |
| `CLOUDFLARE_ACCOUNT_ID`            | Stream + wrangler                                | dev/staging/prod                  |
| `CLOUDFLARE_STREAM_API_TOKEN`      | Stream upload + signed URLs                      | dev/staging/prod                  |
| `CLOUDFLARE_STREAM_WEBHOOK_SECRET` | `/api/webhooks/stream` verify                    | dev/staging/prod                  |
| `PUBLIC_SENTRY_DSN`                | Sentry init (gated)                              | staging/prod                      |
| `PUBLIC_SENTRY_ENV`                | Sentry tag                                       | staging/prod                      |
| `SENTRY_AUTH_TOKEN`                | CI sourcemap upload                              | CI only                           |
| `PUBLIC_CIRCLE_COMMUNITY_URL`      | Community tab                                    | dev/staging/prod                  |
| `DATABASE_URL`                     | Postgres fallback (currently unused; D1 in prod) | local only                        |

---

## Discipline (the rules)

1. **Never commit a secret value.** Pre-commit hooks catch the obvious patterns; the vault catches the rest.
2. **Names only in repo, values only in vault.** `.env.example` documents names; real values never leave Infisical.
3. **No parallel vaults.** Don't paste a secret into CF Pages env vars by hand. Use the Cloudflare integration so Infisical is the single source.
4. **Rotation goes through Infisical first.** Rotate in the vault → integration syncs → done. Don't rotate in the vendor dashboard without updating Infisical.
5. **CI uses service tokens, not personal logins.** Personal logins for local dev only.

See `.planning/architecture/ARCHITECTURE.md` for how Infisical fits into the broader stack.
