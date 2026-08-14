# SOP: Pull Request Workflow

All pre-launch and post-launch work lands on `main` via pull request. Direct pushes to `main` are not permitted.

## Branch naming

| Prefix | When to use | Example |
|--------|-------------|---------|
| `feat/` | New features or endpoints | `feat/wc-webhook` |
| `fix/` | Bug fixes | `fix/session-expiry` |
| `docs/` | Documentation only | `docs/sop-pilot` |
| `chore/` | Dependency bumps, config changes | `chore/deps-june` |
| `ci/` | CI / workflow changes | `ci/smoke-timeout` |
| `migration/` | Database schema changes | `migration/add-events-table` |

Use lowercase kebab-case after the prefix. Keep it short and descriptive.

## Opening a PR

1. Push your branch to `origin`.
2. GitHub will prompt you to open a PR. Use the existing PR template at `.github/pull_request_template.md`.
3. Fill in **What & why** (one paragraph), tick off the checklist, and note any migrations.
4. Assign at least one reviewer before marking ready for review.

## PR checklist (must pass before merge)

- [ ] `pnpm check` passes — no TypeScript or Svelte type errors
- [ ] `pnpm lint` passes — no ESLint errors (warnings are acceptable)
- [ ] `pnpm test` passes — all Vitest unit tests green
- [ ] `pnpm format:check` passes — code is formatted with Prettier
- [ ] New database migrations are in `migrations/` and noted in the PR description
- [ ] No API keys, tokens, or credentials are hardcoded in source files
- [ ] New environment variables are documented in `.env.example`
- [ ] If a webhook endpoint was added, it has HMAC signature verification and idempotency (see `sop-security-hardening.md`)

CI runs all of these automatically on every push to a PR branch. Do not merge until all jobs are green.

## CI jobs

The pipeline defined in `.github/workflows/ci.yml` runs these jobs (all need `install` first):

| Job | Command | What it checks |
|-----|---------|---------------|
| `check` | `pnpm check` | TypeScript + Svelte diagnostics |
| `lint` | `pnpm lint` | ESLint (zero errors required) |
| `format` | `pnpm format:check` | Prettier formatting |
| `unit` | `pnpm test` | Vitest unit tests |
| `build` | `pnpm build` | Full production build (Cloudflare adapter) |
| `smoke` | `pnpm smoke` | Playwright e2e tests (public routes, Chromium) |

All six jobs must pass. The `check`, `lint`, `format`, `unit`, and `build` jobs run in parallel after `install`. The `smoke` job also runs after `install` and caches Playwright browsers against `pnpm-lock.yaml`.

## Merging

- Squash-merge is preferred — keeps `main` history linear and readable.
- The merge commit message should be the PR title, which follows the branch prefix pattern.
- Delete the source branch after merge.
- After merge, verify the Cloudflare Pages preview deploy completes without errors.

## Hotfixes

If a critical fix must ship immediately:

1. Branch from `main`: `git checkout -b fix/critical-thing main`
2. Apply the fix, run `pnpm check && pnpm test` locally.
3. Open a PR — even for hotfixes. One-approve is fine for genuine emergencies.
4. Merge and monitor Cloudflare Pages deploy logs.

## Local checks before pushing

Run these before opening a PR to catch failures before CI does:

```bash
pnpm check          # TypeScript + Svelte type errors
pnpm lint           # ESLint (zero errors)
pnpm format:check   # Prettier formatting
pnpm test           # Vitest unit tests
pnpm build          # Full production build (catches tree-shaking regressions)
```

All five must exit `0`. If `pnpm build` fails locally, fix it before pushing — the CI `build` job will fail too.

## What this repo does NOT allow

- Direct pushes to `main`
- Merging a PR with failing CI
- Committing secrets, credentials, or `.env` files to the repository
- Skipping the PR template checklist
