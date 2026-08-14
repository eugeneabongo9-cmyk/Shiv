# ShivWorks Network — Handoff for Aaron

**Prepared 2026-05-26 by Max Stern (Macks Studios LLC).**
**Engagement:** production-readiness pass for the ShivWorks Network SvelteKit app.
**Billing:** pro bono — $0 to Outerfields. Standard-rate figures kept visible for value reference.

> **For your AI assistant:** this document is a self-contained snapshot of an in-flight engineering engagement. Read it top to bottom. Sections marked **AI-input** are the most useful for answering "where are we, what's left, when will we be done?" — but everything is relevant.

---

## 1. One-paragraph executive summary

ShivWorks Network is a SvelteKit + Cloudflare Pages app at [createsomethingtoday/shivworks-network](https://github.com/createsomethingtoday/shivworks-network). It ships member-facing features (Clerk auth, Stripe checkout, Cloudflare Stream video library, Circle community, VIP calls) but lacked production-grade tooling, error monitoring, and CI gates. Max forked it to [Mxcks/shivworks-network](https://github.com/Mxcks/shivworks-network) and has shipped **7 PRs across 3 waves** of work covering lint/format, pre-commit hooks, governance, error monitoring (Sentry), error boundaries, CI pipeline, and public-route smoke tests. **61 % of the engagement is complete (24.5 of 35.5 hrs).** The remaining 11 hrs (INV-003b auth-gated smoke + INV-007 security hardening) finish by **Tue Jun 2** in the expected case. Four decisions from Aaron unblock the final stretch.

---

## 2. Status snapshot — AI-input

| Metric                               | Value                |
| ------------------------------------ | -------------------- |
| Engagement start                     | 2026-05-26 (today)   |
| Hours spent to date                  | 24.5                 |
| Hours remaining                      | 11.0                 |
| Percent complete                     | 69 %                 |
| Original beta target                 | Sat Jun 1, 2026      |
| Stability ETA — best case            | Fri May 29           |
| Stability ETA — expected             | Tue Jun 2            |
| Stability ETA — worst case           | Fri Jun 5            |
| Standard-rate cost (full engagement) | $4,627.50            |
| **Billed to Outerfields**            | **$0.00 (pro bono)** |

---

## 3. What's already shipped — AI-input

All 7 PRs live as branches on [`Mxcks/shivworks-network`](https://github.com/Mxcks/shivworks-network). Each one is independently mergeable into upstream `createsomethingtoday/shivworks-network` via a cross-repo PR.

| Order | Branch                           | What it does (plain English)                                                                                                                                                                                                                        | Hrs |
| ----- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 0     | `chore/bootstrap-ledger`         | Engineering ledger system + `scripts/sync-upstream.{ps1,sh}`. Every future PR records "why this exists, how to use it, hours spent" in one append-only file.                                                                                        | 1.5 |
| 1     | `chore/eslint-prettier-baseline` | ESLint + Prettier + EditorConfig. Whole codebase reformatted once for clean future diffs. Lint surfaced 15 real security findings + 30 correctness findings — filed as follow-ups.                                                                  | 3.5 |
| 2     | `chore/pre-commit`               | `simple-git-hooks` + `lint-staged` auto-fix formatting/lint on every commit before code leaves the developer's machine.                                                                                                                             | 1.5 |
| 3     | `chore/governance`               | `.github/CODEOWNERS` (right reviewer auto-requested for auth/payments/migrations), Dependabot (weekly dependency PRs), CONTRIBUTING.md.                                                                                                             | 2.0 |
| 4     | `feat/sentry`                    | `@sentry/sveltekit` SDK wired into client + server hooks. Silent-swallow bug in `hooks.server.ts` fixed. Stripe + Clerk webhook failures now captured. No-op until Aaron provides a DSN.                                                            | 4.0 |
| 5     | `feat/error-boundaries`          | 7 `+error.svelte` boundaries (root + dashboard, checkout, library, community, vip-calls, admin) + error-code taxonomy + classifier with 5 new unit tests. Checkout boundary protects revenue: _"Your payment was not charged. No money has moved."_ | 5.0 |
| 6     | `ci/baseline-pipeline`           | GitHub Actions: every PR auto-runs typecheck, lint, format, unit tests, build, smoke. Plus `.github/PULL_REQUEST_TEMPLATE.md` matching the SOP.                                                                                                     | 4.0 |
| 7     | `test/playwright-public`         | Playwright smoke tests for 6 public routes (`/`, `/welcome`, `/login`, `/signup`, `/checkout`, `/sitemap.xml`). Verified locally: 6 passed in 60s. CI smoke job swapped from echo placeholder to real Playwright with browser caching.              | 3.0 |

**Verification — all green on the latest branch:**

```
pnpm check        → 0 type errors across 5,366 files
pnpm test         → 53 unit tests pass
pnpm lint         → exit 0 (151 pre-existing warnings, 0 errors)
pnpm format:check → exit 0
pnpm smoke        → 6 specs pass in ~60s
```

---

## 4. What's left — AI-input

| Branch (proposed)                       | What it does                                                                                                                                                                                                                                                | Hrs | Status                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------------- |
| `test/playwright-auth-gated` (INV-003b) | Smoke tests for authed routes (/dashboard, /library, /community, /settings, /vip-calls). Needs Clerk dev-instance test users.                                                                                                                               | 3.0 | **BLOCKED** on Aaron decisions #2 + #3 below |
| `sec/hardening-pass-1` (INV-007)        | Webhook idempotency (Stripe + Clerk + Stream — prevents double-charging on retry), zod input validation, rate limiting on member-facing endpoints, security headers (CSP/HSTS), admin redirect-loop fix. Closes 4 real vulnerabilities found during intake. | 8.0 | **READY** — no external blocker              |

**Plus follow-ups surfaced during execution (backlog, not in current engagement):**

- `sec/tabnabbing-pass` — fix 15 `target="_blank"` security findings, promote lint rule back to error. ~1.5 hrs.
- `chore/each-key-pass` — fix 30 missing `{#each}` keys. ~1.5 hrs.
- `sec/log-migration` — migrate remaining 7 server-side `console.error` calls to `logError`. ~1.5 hrs.
- `feat/sentry-sourcemaps` — wire CI sourcemap upload once `SENTRY_AUTH_TOKEN` exists. ~0.5 hrs.

---

## 5. Aaron's action items — AI-input

These are the only things blocking completion. Tackle in any order; #1 + #2 unblock the most.

### Decision #1 — Create the Sentry project (15 min, free tier)

**What.** Go to [sentry.io](https://sentry.io), create a free organization (or use an existing one), create a new project of type **SvelteKit**.

**Output you'll get from Sentry:**

- A DSN URL like `https://abc123@o0.ingest.sentry.io/1234567`
- An organization auth token (later, for CI sourcemap upload)

**What to do with them:**

- Paste the DSN into Doppler as `PUBLIC_SENTRY_DSN` in the `prd` config.
- Set `PUBLIC_SENTRY_ENV=production` next to it.
- The next Cloudflare Pages build picks up both vars and activates Sentry. No code change needed — the SDK is already wired in no-op mode.
- (Optional, later) Add the auth token as a GitHub Actions secret named `SENTRY_AUTH_TOKEN` to enable sourcemap upload — that's a separate ~30-min ticket (`feat/sentry-sourcemaps`).

**Why this matters.** Today, errors in production silently vanish — including a known bug where member-hydration failures bounce users to `/checkout` with no incident logged. Once Sentry has a DSN, every error shows up within ~30s with member ID, route, stack trace, and (on the client side) a session replay video.

---

### Decision #2 — Provision Clerk dev-instance test users (15 min)

**What.** In your Clerk dashboard, switch to the **Development** instance (not production). Create 3 users:

| Email                       | Tier metadata | Role           |
| --------------------------- | ------------- | -------------- |
| `e2e+member@shivworks.test` | `bronze`      | regular member |
| `e2e+vip@shivworks.test`    | `vip`         | VIP member     |
| `e2e+admin@shivworks.test`  | (any)         | admin          |

Set each one's password to something memorable but not a real password. Tag all three with a `e2e` metadata flag so they can be filtered out of your founding-member tracker and analytics.

**Credential model.** Pick one:

- **A.** Drop email + password for each user into GitHub Actions secrets (`E2E_MEMBER_EMAIL`, `E2E_MEMBER_PASSWORD`, etc.). Simplest. Max's smoke tests sign in with them.
- **B.** Use Clerk's testing-tokens API (no passwords stored). More secure but more setup. Recommend A for a beta phase.

**Why this matters.** Without these, the auth-gated smoke tests can't run. Members hitting a broken `/dashboard` or `/library` on Jun 1 would not be caught by CI before deploy.

---

### Decision #3 — Replace CODEOWNERS placeholder handles (5 min)

**What.** Open [`.github/CODEOWNERS`](https://github.com/Mxcks/shivworks-network/blob/chore/governance/.github/CODEOWNERS) on the `chore/governance` branch. Replace these placeholders with real GitHub usernames:

- `@TBD-alex` → your dev's GH handle (Alex)
- `@TBD-aaron-or-max` → your handle, or `@Mxcks` if you'd like Max to handle reviews for the relevant paths
- `@TBD-max-stern` → `@Mxcks`

Until real handles replace the placeholders, GitHub silently drops the auto-review-request feature — meaning sensitive PRs (auth, payments, migrations, CI, secrets) merge without the right reviewer being pinged.

---

### Decision #4 — Enable branch protection on `main` (5 min, after the others)

**What.** GitHub repo settings → Branches → add rule for `main`:

- Require status checks: `check`, `lint`, `format`, `unit`, `build`, `smoke`
- Require pull-request reviews: 1 approving review
- Require review from Code Owners: ✅ (only flip this on after Decision #3)
- Restrict who can push to `main`: just you + Alex

**When to do this.** Wait until INV-003b (auth-gated smoke) merges. Otherwise `smoke` is a partial check — it only covers public routes — and your beta deploy on Jun 1 could pass a partial smoke and miss an authed-route regression.

---

## 6. Completion-date projections — AI-input

Assumes one engineer at typical mid-level output (5–6 productive hrs/day).

| Scenario       | Stability date | Assumptions                                                                                                                                                                                                                                           |
| -------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Best case**  | Fri May 29     | Aaron returns all 4 decisions within 24 hrs. Clerk test users provisioned same day. INV-007 lands with no spec deviation. Branch protection enabled EOD Friday.                                                                                       |
| **Expected**   | Tue Jun 2      | Aaron returns decisions within 2–3 business days (Sentry account + Clerk users provisioned Mon–Tue). INV-007 surfaces 1–2 minor spec deviations (~10 % timeline impact, consistent with prior PRs). Verification + branch protection Tuesday morning. |
| **Worst case** | Fri Jun 5      | Aaron unavailable until end of next week. INV-003b cannot run end-to-end. Branch protection enabled with smoke as a soft check.                                                                                                                       |

### Critical-path risk

The expected-case date (Jun 2) misses the original Jun 1 beta target by **one day**. The only way to recover Jun 1 is for Aaron to provision Sentry + Clerk test users by **Fri May 29 morning**. Without that, the network is shippable on Jun 1 but auth-gated smoke is not running — meaning a regression in `/dashboard`, `/library`, or `/checkout-from-paid-state` would not be caught by CI until INV-003b lands.

### Mitigation if the original Jun 1 date matters

Ship the beta on Jun 1 with public-route smoke (INV-003a) only. The remainder of the safety net stays active: typecheck, lint, unit tests, build, error boundaries, Sentry (once DSN arrives). Day-1 risk is well-bounded — INV-005's dashboard error boundary already protects the most-trafficked authed surface from a hard-fail.

---

## 7. What "network stability" means in this engagement

**Stable means:** every PR is gated by typecheck + lint + format + unit tests + smoke (public AND auth-gated) + clean build. Production errors are captured to Sentry with member context and route tags. Every route surface has a contextual error boundary. Webhooks are idempotent and signature-verified. Member-facing endpoints are input-validated and rate-limited. Security headers are enforced. CODEOWNERS is enforced via branch protection.

**Stable does NOT mean feature-complete.** Member-facing functionality (founder-tracker urgency revamp, library hi-fi rebuild, dashboard wireframe) is Alex's lane. This engagement makes Alex's work _safe to deploy_, not the work itself.

---

## 8. Files Aaron will interact with — AI-input

### Files Aaron edits directly

| File                                                | When                                | What                                         |
| --------------------------------------------------- | ----------------------------------- | -------------------------------------------- |
| Doppler `prd` config (no repo file)                 | Decision #1                         | Add `PUBLIC_SENTRY_DSN`, `PUBLIC_SENTRY_ENV` |
| Clerk dashboard (no repo file)                      | Decision #2                         | Create 3 test users + metadata               |
| `.github/CODEOWNERS` (on `chore/governance` branch) | Decision #3                         | Replace 3 placeholder handles                |
| GitHub repo settings → Branches                     | Decision #4                         | Enable branch protection                     |
| GitHub Actions secrets                              | Decision #2 (if credential model A) | Add `E2E_*` email/password pairs             |

### Files Aaron reviews (does not edit)

| File                                 | Purpose                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `.planning/status-report.html`       | Visual status snapshot with gantt + scenarios. Render in browser.                                                                  |
| `.planning/LEDGER.md`                | Per-PR record of what shipped, what files were touched, what deviations occurred, what follow-ups exist. Markdown — AI-ingestible. |
| `.planning/README.md`                | Original engagement plan + rate card + planned PR sequence.                                                                        |
| `.planning/value-sheet.html`         | Investor-grade translation of engineering hours → business value. Standard rates shown for reference; actual billed is $0.         |
| `.planning/specs/` (3 files)         | Original engineering specs that drove each wave. Read only if you want the "why" deeper.                                           |
| `.planning/sops/` (13 files)         | One-per-route SOPs documenting auth model, data deps, error contracts, test bar. Reference material — not for review approval.     |
| `.planning/invoices/` (8 HTML files) | Per-PR invoices at standard rates (estimates, not finals). Stamped `ESTIMATE`. Actual billed: $0.                                  |
| `CONTRIBUTING.md`                    | Contributor one-page guide for any future dev joining the repo.                                                                    |

### Files Aaron can safely ignore

Everything under `node_modules/`, `.svelte-kit/`, `playwright-report/`, `test-results/`. Nothing useful for a human reviewer.

---

## 9. Reference doc index

All paths relative to the repo root.

- **`.planning/HANDOFF-FOR-AARON.md`** — this document.
- **`.planning/status-report.html`** — visual status dashboard with completion scenarios.
- **`.planning/LEDGER.md`** — append-only engineering record. The single most useful file.
- **`.planning/README.md`** — engagement plan + rate card.
- **`.planning/value-sheet.html`** — engineering-value translation for stakeholders.
- **`.planning/specs/01-stack-gaps.md`** — lint, format, smoke, CI, deps gap analysis.
- **`.planning/specs/02-security.md`** — webhook idempotency, validation, rate limits, headers, CWE/OWASP mapping.
- **`.planning/specs/03-error-handling.md`** — Sentry SDK + boundaries + taxonomy.
- **`.planning/sops/00-pull-requests.md`** — branching, commits, review, merge, secrets rotation.
- **`.planning/sops/section-*.md`** (12 files) — one SOP per route surface.
- **`.planning/templates/pr-invoice.html`** — PR-Invoice template.
- **`.planning/invoices/INV-001..008.html`** — pre-execution invoices (estimates).
- **`.planning/invoices/render.mjs`** — invoice renderer.
- **`scripts/sync-upstream.{ps1,sh}`** — keeps your fork's main in lockstep with upstream.
- **`CONTRIBUTING.md`** — distilled SOP for new contributors.

---

## 10. How to merge the work

When you're ready to accept all 7 PRs into `createsomethingtoday/shivworks-network`, open cross-repo PRs from the fork in this dependency order:

```
1. chore/bootstrap-ledger          (foundational)
2. chore/eslint-prettier-baseline  (depends on 1)
3. chore/pre-commit                (depends on 2)
4. chore/governance                (depends on 3)
5. feat/sentry                     (depends on 4)
6. feat/error-boundaries           (depends on 5)
7. ci/baseline-pipeline            (depends on 6)
8. test/playwright-public          (depends on 7)
```

Each branch contains all previous branches' commits, so merging the last one effectively brings in everything. Easiest path: **open one PR for `test/playwright-public` → `main`** and merge that. It's the latest in the chain and contains every prior commit.

The two remaining PRs (`test/playwright-auth-gated` for INV-003b, `sec/hardening-pass-1` for INV-007) will branch off `test/playwright-public` once you're ready to ship them.

---

## 11. Where to find Max

- **Email:** dev.mxcks@gmail.com
- **GitHub:** [@Mxcks](https://github.com/Mxcks)
- **Telegram:** Documents topic in our shared supergroup gets every artifact above.

If your AI assistant has a question this document doesn't answer, the LEDGER.md entries are the most detailed source — read the entry for the PR in question.

---

<sub>Generated 2026-05-26. Standard-rate figures preserved for value reference. **Actual billed to Outerfields: $0.00 — pro-bono engagement.**</sub>
