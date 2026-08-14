# Dev Onboarding — ShivWorks Network

**Welcome.** This is the one-page brief that gets you billing your first hour productively. Read this top-to-bottom before your first commit.

**Your role:** ship 🟢 LAUNCH tasks from `LAUNCH-SPRINT-PLAN.md`. Budget is $500 at $50/hr = 10 billable hours total. Stay in scope and the budget holds.

---

## 60-second platform overview

ShivWorks Network is a **private training platform for ShivWorks members**. Members pay on `shivworkspg.com` (WooCommerce + Fortis), then sign up at `theshivworksnetwork.com` to watch courses, attend livestreams, request VIP calls, and connect with training partners.

- **Public site:** `theshivworksnetwork.com`
- **CF Pages canonical:** `shivworks-network-4zu.pages.dev`
- **Staging:** `https://<hash>.shivworks-network-4zu.pages.dev` (whatever the latest staging-branch deploy is)
- **Owner:** Max Stern (Macks Studios) — engineering lead, point of contact for everything
- **Stakeholder:** Aaron (Outerfields) — owns the WC store, builds visual UI in a separate demo repo we cherry-pick from

---

## What's already been built (status as of 2026-06-01)

Roughly **55-70 hours of engineering** has already landed before your first commit. Skim this so you don't accidentally rebuild something that exists, and so you know which patterns to follow when you write similar code.

### Infrastructure & deploy (🟢 done)

- Cloudflare Pages project on dedicated CF account (`ce810d489150aad89d66eabff9a0288e`)
- Production domain `theshivworksnetwork.com` wired with auto-provisioned SSL
- Staging branch + per-branch preview URLs via CF Pages
- D1 database `shivworks-network-db` (id `77c0198a-…`), preview DB also provisioned
- KV namespace `shivworks-network-kv` (id `a6e45e21…`)
- `nodejs_compat` flag set + compatibility date `2026-03-20`
- `wrangler.jsonc` binds D1 + KV correctly for both prod and preview environments

### Database schema (🟢 done — 13 migrations, 23 tables on remote)

| Migration | What it adds |
|---|---|
| 0001 | Identity core: `members`, `member_sessions`, `member_audit_log`, `courses`, `course_modules`, `events`, `member_entitlements`, `external_links` |
| 0002 | `free_access_tier` config |
| 0003 | `member_episode_progress` |
| 0004 | `member_module_progress` |
| 0005 | `member_imports` (WC purchase queue) |
| 0006 | `member_notification_preferences` |
| 0007 | `member_content_release_alerts` |
| 0008 | `media_assets` + `course_module_episodes` (Cloudflare Stream) |
| 0009 | `processed_webhook_events` (idempotency) |
| 0010 | Performance indexes |
| 0011 | `member_gamification` (stub for future leaderboard) |
| 0012 | (was an early member_profiles attempt — dropped in favor of 0013) |
| 0013 | `member_profiles` (training-profile schema) + `member_tags` + `leaderboard_opt_in` |

All applied to remote D1. Don't write new migrations without checking with Max — they're forward-only and a bad one is a real outage.

### Authentication (🟢 done)

- Clerk-hosted login/signup mounted at `/login` and `/signup` via `ClerkMount.svelte`
- `hooks.server.ts` runs Clerk JWT verification on every request → populates `event.locals.auth` and `event.locals.user`
- `ensureMemberIdentity` in `db/shivworks.ts` creates a member row for first-time logins (defaults `tier='free', access_status='active'`)
- `claimImportedMemberProvision` matches `member_imports` rows by email to bind WC purchases to a Clerk identity
- Session limit enforcement (3 max) in `session-security.ts` — auto-revokes oldest other session, emails the member
- Guards: `requireAuthenticated`, `requireEntitled`, `requirePaidMember`, `requireVip`, `requireAdmin` in `guards.ts`
- KV cache (TTL 300s) on member tier lookup — busted by Clerk + WC webhooks

### Payments + WC integration (🟢 webhook ready, 🟡 secret + WC config pending)

- `/api/wc/webhook` handler with HMAC-SHA256 signature verification, constant-time compare
- Product ID → tier mapping (`31517` → bronze, `31518` → vip)
- Idempotent via `processed_webhook_events` (source='wc', event_id=order.id)
- `upsertImportedMemberProvision` writes to `member_imports` on receipt
- `/checkout` page redirects to WC checkout on `shivworkspg.com` with deep-link product cart
- Stripe webhook routes also exist as legacy (we use WC, not Stripe — those can be cleaned up post-launch)

### Content surfaces (🟢 done — built or shipped via cherry-picks)

| Route | What it does |
|---|---|
| `/` | Marketing landing with founding-member count from D1 |
| `/dashboard` | Member home with continue-watching, upcoming events, recent updates |
| `/library` + `/library/[slug]` | Course catalog + episode playback (inline `<video>` element today, Aaron's `CustomVideoPlayer` is a P2 candidate) |
| `/live` | Livestream surface with RSVP |
| `/updates` | Announcement feed |
| `/vip-calls` | VIP-only request form |
| `/welcome` | Post-signup interstitial with sync polling |
| `/account` | Training-profile form (location, background flags, ECQC alumni, training goal) — PR #31 |
| `/find-partners` | Filterable member directory (state/city/goal/background) — PR #31 |
| `/settings` | Profile + session management + notification preferences |
| `/admin` | Admin-only: member imports + media uploads |
| `/community` | Current state: link-out to Circle. P2 candidate to swap for Aaron's in-app version with mocks. |
| `/messages` `/leaderboard` `/profile` | Placeholders via `ComingSoon` component (PR #31) |
| `/people` | Redirect to `/find-partners` |
| `/sitemap.xml` | Static sitemap |
| `/api/dev/sentry-test` | Synthetic-error endpoint for verifying Sentry capture (delete after launch) |

### Brand + UI shell (🟢 done — Aaron's design v2.2)

- `app.css` — Aaron's brand v2.2 token system (red `#bc1313` accent, dark backgrounds, Industry / FF Good Pro typography)
- `Nav.svelte` — cobra mark + BETA badge
- `Footer.svelte`
- `ClerkMount.svelte` — Clerk widget theme-swapped to Aaron's red palette
- `MemberIdentityPanel.svelte`
- `ProfileChips.svelte` (training-profile pills)
- `SendMessageButton.svelte` (currently disabled stub; enables when DMs land)
- `ComingSoon.svelte` (used by placeholder routes)

### Observability (🟢 done — verified end-to-end with synthetic error)

- Sentry SDK initialized with DSN gating (skips init when `SENTRY_DSN` missing)
- `logError()` in `lib/server/log.ts` — call this instead of `console.error`. It pushes to Sentry with `scope:<label>` tag + extra context.
- 7 server-side `console.error` sites migrated to `logError` (clerk auth, d1-compat migrations, clerk webhook, admin onboarding)
- Replay integration on client (text + media masked, on-error only)
- Scope tagging on authenticated requests: user.id + tier + route
- Error boundaries (`+error.svelte`) on every section with classified copy

### Quality / ops rails (🟢 done)

- ESLint + Prettier baseline (PR #INV-001)
- Pre-commit hooks via simple-git-hooks + lint-staged
- GitHub Actions CI: 7 jobs (install, check, lint, format, unit, build, smoke)
- PR template with What/Why/How/Risk/Test/Ledger sections
- Dependabot for npm + GitHub Actions, weekly Monday 8am Chicago
- CODEOWNERS (placeholders — needs real handles)
- Playwright public-route smoke (6 specs)
- Vitest unit suite (84+ tests passing)

### Load testing (🟢 smoke done — 600 VU deferred)

- Artillery scenarios in `artillery/`: `smoke.yml`, `base.yml`, `authenticated.yml`, `local.yml`
- Wired into `package.json` as `pnpm load:smoke`, `pnpm load:base`, `pnpm load:auth`, `pnpm load:smoke:local`
- Smoke executed against production: 900 reqs / 0 fail / p95 77ms / mean 49ms
- 600-VU run reserved for off-hours day 2 (post-launch)

### WC bulk-migration pipeline (🟢 built — 🟡 awaiting Aaron's WC REST API key to run)

4 scripts + runbook for backfilling existing WooCommerce founding-member buyers:
- `scripts/wc-extract.ts` — pulls orders from WC REST API → CSV
- `scripts/wc-build-sql.ts` — compiles CSV → batched UPSERT SQL
- `scripts/wc-reconcile.ts` — diffs CSV vs D1, reports missing/extra
- `scripts/wc-stale-flag.sql` — finds unclaimed imports older than 14 days
- `docs/wc-bulk-migration-runbook.md` — full canonical sequence

### Launch automation (🟢 done)

- `scripts/launch.ps1` — verify → snapshot tag → migrate → deploy → smoke
- `scripts/rollback.ps1` — re-deploy a backup tag
- `scripts/test-wc-webhook.ps1` — fake-signed POST to verify endpoint without WC
- `scripts/verify-deploy.ps1` — curl every public + auth-gated route

### Architecture docs (🟢 done — your primary reference set)

- `.planning/architecture/MAP.html` + `.md` — system map
- `.planning/architecture/AARON-FRONTEND-ERD.html` — routes × libs × tables
- `.planning/architecture/LAUNCH-FLOW-BOARD.html` (Mermaid) + `LAUNCH-FLOW-BOARD-GRAPHVIZ.html` (Viz.js) — pan/zoom user-flow boards
- `.planning/architecture/LAUNCH-UX-UI-MAP.html` — screen catalog with wireframes
- `.planning/architecture/AARON-SITEMAP.md` — full prose intake of every route in Aaron's reference repo
- `.planning/architecture/AARON-RECONCILE.md` — migration renumbering plan
- `.planning/architecture/LAUNCH-READINESS-BRIEF.md` — synthesized 5-lens audit (Sentry, Artillery, WC flow, member info, bulk migration)
- `.planning/architecture/UI-INTEGRATION-PATHS.md` — what's mocked vs real, P1/P2/P3 sequencing
- `.planning/aaron-tonight.md` — 5-step external checklist Aaron follows

### What's still pending (🟡 — drives the sprint backlog)

| Area | What's left | Blocker |
|---|---|---|
| Section 4 auth flow | Real-browser end-to-end smoke | Human in browser |
| Section 5 WC webhook | Wire WC_WEBHOOK_SECRET + real-purchase rehearsal | Aaron (secret + WC admin) |
| Section 6 bulk backfill | Run extract + reconcile + remote apply | Aaron (read-only WC REST API key) |
| Section 8 email delivery | Confirm welcome email lands in inbox + passes DKIM/SPF | Human (same flow as §4) |
| P2 mocked UI | Aaron's `/community`, `/messages`, `/leaderboard`, `/profile` shells | Not blocked — explicitly out of 10-hour budget |
| Sourcemap upload | Sentry vite plugin in CI | Post-launch quality-of-life |
| 600-VU load test | Production run | Schedule off-hours day 2 |

These are detailed in `LAUNCH-SPRINT-PLAN.md` with hour estimates and cumulative budget.

### What's NOT built (intentional non-goals for launch)

- In-app community channels (Aaron's full version) — placeholder for now, ships Phase 2
- Direct messages between members
- Gamification (training points, leaderboard, milestones, recognitions)
- Onboarding checklist overlay
- In-app notification bell
- Public profile pages (`/profile/[userId]`)
- Admin analytics dashboard
- Real-time DM listener
- Recognition feed

Those are all in `UI-INTEGRATION-PATHS.md` as P2/P3 candidates for future sprints.

---

## Stack at a glance

| Layer | Tech |
|---|---|
| Frontend | SvelteKit 2 + Svelte 5 + Vite 6 |
| Hosting | Cloudflare Pages on `@sveltejs/adapter-cloudflare` |
| Runtime | Cloudflare Workers (nodejs_compat enabled) |
| Database | Cloudflare D1 (binding: `DB`, name: `shivworks-network-db`) |
| Cache | Cloudflare KV (binding: `KV`, name: `shivworks-network-kv`) |
| Auth | Clerk (`@clerk/backend` + `@clerk/clerk-js`, hosted UI) |
| Payments | WooCommerce + Fortis (external; checkout redirects out) |
| Video | Cloudflare Stream |
| Email | Resend |
| Errors | Sentry (`@sentry/sveltekit`) |
| Secrets | Cloudflare Pages env vars (per-environment: Production / Preview) |
| Package manager | pnpm 9.15 |
| Node | 20 (CI matches; dev whatever; nvm fine) |

---

## Before Day 1 — Contractor Compliance (required, not billed)

**Complete this before your first commit or first billable engagement. No payment can be released without it.**

Your role determines which documents you complete. Read your track only.

---

### 🧑‍💻 Track A — Developer / Contractor

*You are being hired to write code or deliver technical work.*

**Documents you receive and complete (open in any browser):**

| # | File | Time | What you do |
|---|---|---|---|
| 1 | `data-handling-notice.html` | ~2 min | Read how your personal information is stored. Sign at the bottom. Export the JSON. |
| 2 | `nda.html` | ~3 min | One-way NDA protecting Macks Studios LLC confidential information you're exposed to. Sign. Export. |
| 3 | `index.html` | ~5 min | Full intake form — legal name, tax status, USDC wallet, work arrangement, contact preferences. Export the JSON. |

**What to have ready:**
- Legal name and mailing address as they appear on your ID
- USDC wallet address on Base network (self-custody — MetaMask, Rabby, or Coinbase Wallet)
- Whether you're contracting as an individual (W-8BEN) or through a registered company (W-8BEN-E)
- Country of tax residence + confirmation all work is performed outside the US

**After you submit:**
1. Email all three exported JSON files to **dev.mxcks@gmail.com** — subject: `Contractor Intake — [Your Name]`
2. Confirmation within **24 hours**
3. W-8BEN / W-8BEN-E PDF request within **48 hours** (download from irs.gov, complete, return as PDF)
4. Brief **wallet verification call** before first payment
5. **Master Services Agreement** sent once all documents are received — sign it, then you're cleared to bill

**Payment:** USDC on Base, invoiced in USD at spot rate at time of transfer.

---

### 🏢 Track B — Business Owner / Partner

*You are collaborating with Macks Studios LLC as a business partner, not as a direct contractor. You handle documents on behalf of the engagement and may have your own business entity.*

**Documents you receive and complete:**

| # | File | Time | What you do |
|---|---|---|---|
| 1 | `mutual-nda.html` | ~3 min | Bilateral NDA — both parties' confidential information is protected equally. Both sides sign. Export the JSON. |

**Documents you are responsible for handling (do not fill out yourself):**

| Document | Your role |
|---|---|
| `AARON-DOCUMENT-HANDLING.md` | Your operational protocol — read this fully. It tells you exactly what to do when a developer's document package arrives. |
| Developer intake packages (JSON + W-8BEN PDF) | Receive, verify, route, confirm. Follow the handling protocol. |

**What to have ready for the mutual NDA:**
- Your full legal name and business entity name (if applicable)
- Your business type (e.g. LLC, sole proprietor)

**After signing the mutual NDA:**
1. Email the signed JSON export to **dev.mxcks@gmail.com** — subject: `Mutual NDA — [Your Name / Entity]`
2. Max confirms receipt and stores it in the compliance vault
3. A Partnership / Collaboration Agreement will follow for any specific project engagement

> **Note:** Business partners do not submit an intake form, W-8BEN, or data handling notice — those are for individual contractors only. If you are unsure which track applies to you, ask Max before completing anything.

---

## Day 1 setup (~30 min, not billed)

You should be able to run this in under 30 minutes. **This time is not counted against the $500.**

1. **GitHub access:** Max adds you to `createsomethingtoday/shivworks-network` with write role (not admin)
2. **Clone:** `git clone https://github.com/createsomethingtoday/shivworks-network.git && cd shivworks-network`
3. **Install:** `pnpm install`
4. **Sanity check:** `pnpm check` → 0 errors expected. `pnpm test` → 84+ pass expected. If either fails, ping Max before continuing.
5. **Dev server:** `pnpm dev` — boots on `127.0.0.1:5173`. Hit `http://127.0.0.1:5173/` — should render landing. (Some pages will need Clerk dev keys; you can ignore auth flows for most P2 UI work.)

What you do NOT need on day 1:
- Cloudflare account login (you only need the dashboard if you're debugging production)
- Sentry account access (Max will share if a task needs it)
- Production secrets — never paste those in code, never need them locally

If you need WC sandbox keys, Clerk dev keys, or anything else, ping Max — he'll generate or share them.

---

## Repo orientation

```
src/
├── app.css                  ← Aaron's brand v2.2 design tokens (red #bc1313)
├── hooks.server.ts          ← Sentry init, Clerk auth, member hydration, KV cache
├── hooks.client.ts          ← Sentry client init
├── lib/
│   ├── components/          ← Shared Svelte components (Nav, Footer, etc.)
│   ├── server/
│   │   ├── db/shivworks.ts  ← THE big database module (~3500 lines). Most queries live here.
│   │   ├── clerk.ts         ← Clerk session verification
│   │   ├── guards.ts        ← requireAuthenticated / requireEntitled / requirePaidMember
│   │   ├── wc-webhook.ts    ← WC HMAC signature verify + tier mapping
│   │   └── log.ts           ← logError() — call this instead of console.error
│   ├── errors/              ← Error taxonomy + classifier
│   └── constants/           ← Tiers, site URLs, etc.
└── routes/
    ├── +page.{server.ts,svelte}     ← landing
    ├── +layout.{server.ts,svelte}   ← global shell (Nav, Footer)
    ├── login/  signup/              ← Clerk hosted UI mount
    ├── welcome/                     ← post-signup interstitial
    ├── account/                     ← training profile form (PR #31)
    ├── find-partners/               ← member directory (PR #31)
    ├── dashboard/  library/  live/  updates/  vip-calls/  settings/
    ├── community/  messages/  leaderboard/   ← placeholders / mocked (see UI-INTEGRATION-PATHS.md)
    └── api/                         ← endpoints (clerk webhook, wc webhook, library/episodes, etc.)

migrations/                  ← D1 forward-only migrations 0001-0013
scripts/                     ← launch.ps1, wc-extract.ts, etc.
.planning/                   ← all architecture + planning docs
artillery/                   ← load test scenarios
```

**Files to read first** (in order):
1. This doc
2. `.planning/architecture/UI-INTEGRATION-PATHS.md` — what's mocked vs real
3. `.planning/architecture/LAUNCH-READINESS-BRIEF.md` — what's still broken
4. `.planning/architecture/MAP.md` — system map (open MAP.html for visuals)
5. `src/lib/server/db/shivworks.ts` — skim, don't read every line, just know what's available

---

## The deploy model — important, read carefully

| Branch | Becomes | Who sees it |
|---|---|---|
| `main` | `theshivworksnetwork.com` | The whole internet (production) |
| `staging` | `https://<hash>.shivworks-network-4zu.pages.dev` | Anyone with the URL (review env) |
| Any other branch (`feat/xyz`) | `https://<hash>.shivworks-network-4zu.pages.dev` | Anyone with the URL (per-PR preview) |

**Crucial:** **everything merged to `main` is live on production within ~90 seconds.** No QA gate, no manual deploy step. If you push something broken to main, real visitors see it. Use preview URLs and PRs religiously.

---

## How to ship a change

1. `git checkout main && git pull` — start fresh
2. `git checkout -b feat/<short-descriptive-name>` — branch off main
3. Make changes
4. `pnpm check` (0 errors) + `pnpm test` (all green) + `pnpm lint` — must pass before pushing
5. `git push -u origin feat/<name>` — push the branch
6. CF Pages builds the preview deploy automatically — URL appears in CF dashboard ~90 sec later (Max can fetch it via `wrangler pages deployment list`)
7. `gh pr create --base main --title "..." --body "..."` — open the PR (template auto-fills)
8. Wait for CI green (all 7 jobs)
9. Max reviews + merges. **Do not self-merge.**
10. CF auto-deploys main to production

---

## Conventions

- **Branch names:** `feat/`, `fix/`, `chore/`, `docs/`, `test/` prefix
- **Commit messages:** Conventional commit format (`feat(scope): ...`, `fix(scope): ...`)
- **PR titles:** Same as commit but with scope clearly named
- **Ledger:** every PR that ships code adds an entry to `.planning/LEDGER.md`. Required.
- **Comments:** only when WHY is non-obvious. No `// added by John on 2024-01-15` cruft.
- **Tests:** unit tests in `*.test.ts` next to the file. E2E in `tests/`. Add tests when you fix a bug.
- **Secrets:** never commit. If you find one committed, ping Max immediately (don't try to scrub history yourself).

---

## Where to find truth

| Question | Doc |
|---|---|
| What does this platform actually do? | `.planning/architecture/MAP.html` (open in browser) |
| What does each page do? | `.planning/architecture/AARON-SITEMAP.md` |
| What's mocked vs real? | `.planning/architecture/UI-INTEGRATION-PATHS.md` |
| What's still broken before launch? | `.planning/architecture/LAUNCH-READINESS-BRIEF.md` |
| Show me a visual flow | `.planning/architecture/LAUNCH-FLOW-BOARD-GRAPHVIZ.html` |
| What's been shipped historically? | `.planning/LEDGER.md` |
| What am I supposed to do this sprint? | `.planning/LAUNCH-SPRINT-PLAN.md` ← **start here every morning** |

---

## Don't do this (production-safety list)

1. **Don't push to `main` directly.** Always PR.
2. **Don't self-merge PRs.** Max reviews.
3. **Don't run `wrangler d1 execute --remote --file=...` on the production DB** without Max approving the SQL file
4. **Don't `git push --force` to `main` or `staging` ever.** Force-push only to your own feat branches.
5. **Don't edit `wrangler.jsonc` bindings** (D1 IDs, KV IDs, account ID) without Max
6. **Don't paste secrets in chat, Slack, or commits.** Use Bitwarden / Infisical share links.
7. **Don't add new npm dependencies** without justification — every dep is bundle weight on Cloudflare's edge. Ask first.
8. **Don't update `compatibility_date` in wrangler.jsonc.** Workers behavior may shift; coordinate with Max.

---

## Who's who

| Person | Role | Reach for |
|---|---|---|
| **Max Stern** | Engineering lead + owner | Anything code, architecture, secrets, PR review, CF account |
| **Aaron (Outerfields)** | Visual designer + WP/WC owner | UI questions, WC store, marketing site, product photography |
| **Micah (Create Something)** | Repo admin | GitHub access, branch protection |
| **You (the new dev)** | Implementation IC | Ship the 🟢 LAUNCH tasks; flag scope changes early |

---

## Admin rights & access boundaries

This section is critical. Read it carefully. Mistakes here cost more than $500 to undo.

### Two different things called "admin"

Term gets overloaded in this codebase, so let's separate them up front:

| Concept | What it controls |
|---|---|
| **System admin** | Your access to platform services outside the code: GitHub, Cloudflare dashboard, Sentry, Clerk dashboard, WordPress. Controlled by Max + Micah. |
| **In-app `admin` role** | A flag on the `members` table (`role: 'admin'`). Lets a logged-in user reach `/admin` + perform privileged in-app actions. Controlled by setting a column in D1. |

### Your system-level access (default, day 1)

| Service | Your access | Why |
|---|---|---|
| GitHub repo | **Write** (push branches, open PRs) — NOT admin | You can ship code; you can't change repo settings or branch protection |
| Cloudflare account | **None** by default | Max owns this; if you need to debug a deploy, ping him. Don't request access until task #N actually requires it. |
| Cloudflare D1 (remote production) | **Read-only via wrangler** if Max provisions a token | You can run `SELECT` queries; you cannot `INSERT`/`UPDATE`/`DELETE` without Max approving the SQL file first |
| Cloudflare D1 (local dev) | **Full** (it's your laptop) | Wreck it freely; reset with `wrangler d1 execute ... --local` |
| Sentry | **Read** dashboard | View errors, search by tag — that's it. Don't edit alerts. |
| Clerk dashboard | **None** by default | Max provisions test users / dev keys as needed |
| WordPress / WooCommerce | **None** | Aaron's domain; the dev never touches WC admin |
| Resend dashboard | **None** | Same — Max checks if needed |
| Infisical / Bitwarden | Invitation only | Max shares specific secrets per task via one-time links |

The default posture: **read-only or no access**. You ask for access when a task needs it. Don't pre-emptively request admin to "have it just in case."

### In-app admin role

The platform itself has an admin role for managing members. Setting `members.role = 'admin'` on a Clerk user grants them:

- Access to `/admin` (member-import management, media uploads, admin analytics)
- The ability to trigger member-import onboarding emails
- The ability to upload Cloudflare Stream video for the library
- Bypass on `requirePaidMember` / `requireVip` guards (admins see everything)

**To make yourself admin on a test account (when a task requires it):**

1. Sign up via Clerk on staging or production (use a test email you control)
2. Ping Max with your `clerk_user_id` (find it in `members.clerk_user_id` after signup)
3. Max runs:
   ```bash
   wrangler d1 execute shivworks-network-db --remote --command="UPDATE members SET role='admin' WHERE clerk_user_id='<your-id>'"
   ```
4. Bust the KV cache (Max does this) or wait 5 min for TTL
5. You can now hit `/admin`

**Reverse when done:**
```bash
wrangler d1 execute shivworks-network-db --remote --command="UPDATE members SET role='member' WHERE clerk_user_id='<your-id>'"
```

You do not flip `role` on other people. Ever. Even temporarily.

### Production-DB actions you may NOT do without Max signing off

These all touch `--remote` in wrangler commands. **Every one needs Max to OK the exact SQL file or command first.**

- `wrangler d1 execute shivworks-network-db --remote --command="..."` — any write (INSERT/UPDATE/DELETE) on prod
- `wrangler d1 execute shivworks-network-db --remote --file=...` — any SQL file applied to prod
- `wrangler d1 migrations apply shivworks-network-db --remote` — adding a new migration to prod
- `wrangler pages deployment delete ...` — removing a deployment
- `wrangler kv:key delete ... --binding=KV` — busting cache keys on prod KV
- Any direct edit of `wrangler.jsonc` that changes `database_id`, `kv_namespace`, or `compatibility_*`

What you CAN do without sign-off:
- `wrangler d1 execute shivworks-network-db --remote --command="SELECT ..."` (read-only)
- `wrangler d1 execute shivworks-network-db --local ...` (anything local)
- `wrangler pages deployment list` (read)
- `wrangler d1 list` (read)
- Read your own user account in production: `SELECT * FROM members WHERE clerk_user_id='<your-id>'`

When in doubt — paste the command into Slack and ask "is this safe to run?" before running it. Max will confirm in under a minute. The cost of asking is zero; the cost of a bad write is hours of recovery.

### CF Pages dashboard access — if you need it

If a task absolutely requires the CF dashboard (which is rare for a dev), Max may add you as a **"Member"** on the Cloudflare account with **"Pages: Edit"** permission only. That lets you:
- See deployments
- Retry a deployment
- View build logs
- Add a per-environment env var (after Max approves the value)

It does NOT let you:
- Delete the project
- Change billing / account settings
- Add/remove other users
- Change DNS or domain settings (those are zone-level, separate)
- Issue API tokens

You do NOT need this access unless a task literally requires clicking a button in the CF dashboard. Most tasks can be done with wrangler CLI from your terminal once Max provisions a token.

### Secrets handling — admin discipline

Secrets you may handle during your sprint:
- WC consumer key + secret (Aaron generates, Max shares via one-time link, you use them in a single CLI invocation, then close the terminal)
- Clerk test user passwords (Max creates, shares for one signup, you delete the test user after)

What you do with secrets:
- Set them as PowerShell session env vars (`$env:WC_CONSUMER_KEY = "..."`) for the duration of one command
- Never commit them to git
- Never paste them into chat with Claude, Slack, email, or PR descriptions
- Never write them to a file in the repo (even `.env.local` is risky — that's user-machine only, not the dev's machine)
- After use, clear the env var: `Remove-Item Env:WC_CONSUMER_KEY`

If you accidentally commit a secret:
1. **Stop immediately.** Don't push.
2. Ping Max in Slack with "I accidentally committed a secret in commit `<sha>`, branch `<name>`"
3. Max rotates the secret, then handles the git-history scrub. **Don't try to scrub history yourself** — it usually leaves the secret reachable via reflog and makes recovery harder.

### Escalation ladder

When you hit a permissions wall:

1. **First:** check if the task can be done without that permission (often yes — wrangler CLI replaces 90% of dashboard clicks)
2. **Second:** ping Max with the exact command/action you want to run + why
3. **Third:** if Max says yes, he either runs it for you or provisions just-in-time access
4. **Fourth:** after the task is done, the access is revoked

The principle: **least privilege, just in time.** Standing admin access on prod isn't a perk — it's a liability that grows the blast radius of any mistake.

---

## Billing rules (read before logging hours)

Three task categories — only ONE counts against your $500:

| Category | Counts? |
|---|---|
| 🟢 **LAUNCH** — feature work that delivers platform value | **YES — bill this** |
| 🟡 **OPS** — operational/admin setup work | YES if you do it (usually Aaron / Max) |
| ⚪ **RECOVERY** — restoring something lost, fixing internal mess-ups, merge conflicts caused by tooling | **NO — don't bill this, ping Max instead** |

If you find yourself spending **more than 15 minutes** on:
- Resolving a merge conflict you didn't introduce
- Restoring a deleted doc
- Fixing CI that's broken on main (not because of your change)
- Untangling something an agent or sub-task created

**STOP. Ping Max.** That's our overhead, not your budget. He'll re-scope and possibly take it off your plate.

What DOES count toward your $500:
- Writing code on a 🟢 task
- Writing tests for that code
- Reviewing your own PR before requesting review
- Responding to PR review feedback
- 15% per-task coordination overhead (standups, async questions) is built into the estimate, no need to track separately

---

## First-day Q&A check-in

When you finish reading this, send Max a short message confirming:
1. You can run `pnpm check` and it returns 0 errors
2. You've read `LAUNCH-SPRINT-PLAN.md` and the first 🟢 task is clear
3. Any questions on conventions, scope, or which doc to read

That message ends day-0 onboarding. Your first billable hour starts at the first commit on your first task.

Welcome aboard.
