# SOP — Pull Requests

Applies to every change merged into `main` on `createsomethingtoday/shivworks-network` (or its forks).

## 1. Branching

| Type            | Prefix   | Example                        |
| --------------- | -------- | ------------------------------ |
| Feature         | `feat/`  | `feat/library-progress-resume` |
| Fix             | `fix/`   | `fix/stripe-webhook-replay`    |
| Chore / tooling | `chore/` | `chore/eslint-baseline`        |
| Documentation   | `docs/`  | `docs/handoff-from-alex`       |
| Security        | `sec/`   | `sec/csp-headers`              |

Branch off latest `main`. One PR = one logical change. No mixing of `chore` + `feat`.

## 2. Commits

Conventional Commits, imperative, ≤ 72 char subject.

```
<type>(<scope>): <subject>

<body — optional, wrap at 80>

<footer — issue refs, BREAKING CHANGE>
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `sec`, `perf`, `ci`. Scopes match top-level section names where possible (`checkout`, `library`, `api`, `auth`, `db`, `ci`, etc.).

## 3. Required checks (branch protection)

A PR merges only when **all** pass:

- `check` (svelte-check)
- `lint` (eslint)
- `format` (prettier --check)
- `unit` (vitest, coverage ≥ threshold)
- `smoke` (Playwright public + auth-gated)
- `build` (vite build for Cloudflare adapter)
- 1 approving review from CODEOWNERS for any file under `src/lib/server/`, `migrations/`, `.github/workflows/`, `wrangler*.jsonc`.

## 4. PR description template

Lives at `.github/PULL_REQUEST_TEMPLATE.md`. Required sections:

```
## What
One sentence.

## Why
Link the spec / issue / Linear ticket.

## How
Bullet the approach.

## Risk
- Blast radius:
- Rollback plan:

## Testing
- [ ] Unit
- [ ] Smoke locally
- [ ] Manual happy path
- [ ] Manual error path

## PR-Invoice
Attach `.planning/invoices/INV-XXX-*.html` (rendered or PDF) when the PR is a billable deliverable.
```

## 5. Review checklist (reviewer runs through)

- Does the change match the spec it references?
- Any new `console.error` not routed through `logError`?
- Any new `+server.ts` POST/PUT/DELETE without zod validation?
- Any new env var added to `.env.example`?
- Any new dependency — is the license MIT/Apache/BSD/ISC? Bundle-size impact noted?
- Migrations: forward-only; `0009_...` numbering contiguous; tested on a fresh D1 dev db.
- Sentry capture present at the new failure boundary?

## 6. Merge strategy

**Squash merge** for `feat/`, `fix/`, `chore/`, `docs/`, `test/`, `perf/`.
**Rebase merge** for `sec/` (preserve atomic security commits for audit trail).
No merge commits to `main`.

Title of squashed commit follows Conventional Commits.

## 7. Post-merge

1. CI deploy job pushes to Cloudflare Pages (`main` → production).
2. Sentry release auto-created via `@sentry/vite-plugin` using `git rev-parse HEAD`.
3. If migrations included: `pnpm migrate` is run manually by Alex (not in CI yet — see backlog).
4. Mark the corresponding PR-Invoice as **paid** when the client settles. File rendered PDF under `.planning/invoices/paid/`.

### 7a. Ledger entry — required on every merge

Every PR that adds or modifies a script, config file, automation, feature, or any executable artifact **must** append at least one entry to `.planning/LEDGER.md` before merge. The entry follows the format documented at the top of that file (Why / What / Files / How to verify / Depends on / Hours).

**Waiver path.** Pure documentation PRs (`docs:` type, no executable artifact touched) and planning PRs (`chore: planning` that only touch `.planning/`) may skip the ledger entry. The PR description must explicitly state `ledger: waived — docs only` or `ledger: waived — planning only` to claim the waiver. Reviewer enforces.

**Why this rule exists.** Specs describe intent, invoices describe cost. The ledger is the only artifact that records what physically lives in the repo and why. Without it, vestigial code accumulates because no one remembers what is load-bearing.

## 8. Hotfix flow

For production-only critical fixes:

1. Branch `fix/hot-<slug>` off `main`.
2. Single commit, single PR, single approver waived to "any maintainer" for severity ≥ S2.
3. Smoke + unit must still pass. Lint waived only with `[hotfix-waiver]` in commit body + post-merge cleanup PR within 24h.

## 9. Secrets rotation

Quarterly (Jan / Apr / Jul / Oct, first business Monday):

- Clerk secret key
- Stripe secret + webhook secret
- Resend API key
- Cloudflare Stream API token
- Doppler service tokens for CI

Procedure:

1. Rotate in vendor dashboard.
2. Update in Doppler `prd`.
3. Doppler GitHub Action syncs to repo secrets within 60s.
4. Trigger a no-op `chore/secrets-rotation-YYYY-QN` PR so CI re-deploys with fresh creds.

## 10. PR-Invoice expectation

Every PR authored under a Macks Studios engagement attaches a PR-Invoice (`.planning/templates/pr-invoice.html`, filled). The invoice itemizes:

- Files added / changed / deleted (counts + paths)
- Line items per task within the PR with hours
- Rate × hours = subtotal per line
- Total = sum of line subtotals

Submitted with the PR. Paid invoices archived under `.planning/invoices/paid/INV-XXX.pdf`.
