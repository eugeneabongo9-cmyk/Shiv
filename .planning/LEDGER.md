# Engineering Ledger — ShivWorks Network

Append-only record of every automation, script, config file, and structural feature merged into the repo. Newest entry at top.

---

## 2026-08-13 · Evidence · Corner radius index

**Commit:** `3e634e0` · **Audit:** `.planning/ui-audits/radius-tokens.md`

### Why

The owner reported the radii look inconsistent, said he normally uses 6px, and asked for the
index as evidence so he could check it himself.

### What was found

The designs do specify, and `app.css` defines the same two tokens correctly and identically:
`--radius-button: 4px`, `--radius-card: 8px`. Neither side follows them.

|                  | approved design | shipped app |
| ---------------- | --------------: | ----------: |
| declarations     |              46 |         229 |
| distinct values  |              15 |          26 |
| using the tokens |               3 |          13 |
| hardcoded        |        43 (93%) |   216 (94%) |

The proportions match. The implementation did not drift from the handoff — it reproduced the
handoff's habit at four times the volume. "Follow the design" therefore does not resolve this.

Excluding pills, circles and square corners, 167 declarations remain across 22 values, twelve
of them between 2px and 12px. `6px` is the most-used on both sides (37 in the app, 7 in the
design) — the owner's instinct matches practice better than the declared token does.
`--radius-button` is referenced exactly once in the whole stylesheet.

### Outcome

Three options recorded for decision. Needs Aaron as well as Max, since it is his design that
declares 4/8. The durable half of the fix is a lint rule rejecting raw radii in the component
band; without it the same erosion repeats.

### Hours

| Role          | Hours   | Rate | Subtotal   |
| ------------- | ------- | ---- | ---------- |
| mid-level dev | 1.0     | $50  | $50.00     |
| **Total**     | **1.0** |      | **$50.00** |

---

## 2026-08-13 · Access · Re-gate Community and VIP calls

**Commit:** `a8bce54`

### Why

Both surfaces were un-gated on 2026-07-29/30 (`3e36400`, `036482c`) without sign-off from
either the owner or the client. Paying members had been seeing sections with no approved
content and no approved design. Re-gated on the owner's explicit written instruction.

### What changed

Two entries added to `GATED_ROUTES`. Uses the existing launch-gating mechanism, so behaviour
matches every other staged surface: navigation stays visible, clicking renders `ComingSoon`
in place of the page body, admins still preview the real page. Each entry carries a fallback
link to the library so a member is never left at a dead end.

### Safety note

Gating causes the guards to short-circuit before their tier check. That is safe rather than a
hole: `+layout.svelte` renders `ComingSoon` instead of the route's page, so no content is
reachable either way. The effect is that a free member sees the staged message rather than
being bounced to checkout for a page that does not exist yet.

### Deviation

Three tests failed because they encoded the previous product decision. Updated rather than
deleted, and strengthened: `launch-gating.test.ts` now asserts both routes are hidden from
every member tier while admins bypass, so re-opening either is a deliberate act that must
change a test. The free-member redirect case in `guards.test.ts` moved to `/library`, the
equivalent surface still ungated, keeping that contract covered.

### Verification (local, 2026-08-13)

```
$ pnpm check → 5474 files, 0 errors
$ pnpm test  → 64 files, 408 tests, 408 passed
```

### Hours

| Role          | Hours   | Rate | Subtotal   |
| ------------- | ------- | ---- | ---------- |
| mid-level dev | 0.5     | $50  | $25.00     |
| **Total**     | **0.5** |      | **$25.00** |

---

## 2026-08-13 · INV-011 · Member surface scoping — and a correction

**Commits:** `a573a43`, `3ddcc18` · **Audit:** `.planning/ui-audits/member-surfaces.md`

### Why

The owner was unsure whether the member UI work was in scope and asked for an outline. A
class-inventory diff of the full 15-page handoff against shipped code answers it with numbers
rather than impressions.

### Result

| surface   | design | shipped | page-level gap |
| --------- | -----: | ------: | -------------: |
| dashboard |     91 |      57 |              5 |
| landing   |     73 |      94 |              8 |
| community |     74 |      56 |             18 |
| course    |     88 |      70 |             22 |
| updates   |     77 |      31 |             23 |
| library   |     92 |      52 |             30 |
| admin     |    122 |      86 |             61 |

### Deviation — the first revision was wrong and was published

`a573a43` reported that every shipped surface already carried more markup than its design, and
concluded no port round was warranted. That was false for six of seven pages.

Two extraction faults, both recorded in the audit's method section because either alone
produces a confidently wrong scope:

1. Comparing a design page against its route file alone. `/library` and the course player
   delegate markup to components, so `/library` measured 4 classes against 15.
2. Reading only `<main>` from the handoff. The handoff builds most of its markup from
   JavaScript string concatenation, so `<main>` is near-empty — `admin.html` measured 2
   classes when it carries 122. This undercounted the design side, inverting the conclusion.

Corrected in `3ddcc18` before any work was scoped against it.

### Findings that survived the correction

- Every `media-ph*` class is a mockup stand-in rendering `[ Course thumbnail — … ]`. Shipped
  pages already render real artwork; porting these would be a regression.
- `play-badge`, `live-dot` and `brass` already exist in `app.css` and are used correctly on
  `/live`.
- The custom player scrubber is an architectural decision, not a port: reproducing it means
  replacing the Cloudflare Stream embed and forfeiting signed-URL playback.

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| mid-level dev | 3.0     | $50  | $150.00     |
| **Total**     | **3.0** |      | **$150.00** |

---

## 2026-08-12 · INV-010 · Stream link integrity — root cause of the client playback failure

**Commits:** `2d3faef`, `78ebbf3`, `b94440a`

### Why

The client reported a lesson that would not play while every dashboard reported it healthy:
`ingest_status = ready`, episode `available`, Cloudflare's video list showing nothing wrong.

### What was found

The episode pointed at a Stream UID that does not exist in Cloudflare. The real video sat in
Stream attached to nothing. Visible only by cross-referencing the two systems, which nothing
was doing.

Root cause is `createEpisodeFromStreamReference`, the paste-a-Stream-ID path. Both callers
asked Cloudflare about the UID inside a bare `try { … } catch { }`. Any failure — including a
404 for a UID that does not exist — was swallowed and recorded as `processing`, which is
indistinguishable from a genuine encoding wait. A lesson was created against a video that
would never arrive and nobody was told.

`parseApiJson` also threw a plain `Error`, discarding the HTTP status, so callers could not
tell "this video does not exist" from "Cloudflare is unreachable" — cases needing opposite
handling.

### What was built

- `scripts/audit-stream-links.mjs` — read-only cross-reference of every media asset against
  Stream. Reports broken links, assets still encoding, and Cloudflare videos with no episode
  attached. Exits non-zero on breakage so it can gate a release.
- `StreamApiError` carrying HTTP status and Cloudflare error codes, plus
  `checkStreamVideoExists()` returning `true` / `false` / `'unknown'`. A definitive absence is
  rejected; `'unknown'` stays lenient because the UID may be valid and the webhook will settle
  it.
- Both callers reject an unrecognised UID with the ID in the message. In the lessons path the
  Stream reference is now resolved before `createCourseModule`, so a rejection no longer
  leaves an empty module behind.

### Deviation — the audit shipped with a blind spot

`2d3faef` inspected `media_assets` only. A module can also embed a Stream video directly via
`course_modules.video_url` (migration 0024 does exactly this). Two videos members are watching
— `Origin Story d4.mp4` and `Roadshow FINAL.mp4` — were therefore reported as orphaned and
safe to delete. The owner had already been sent that list. Corrected in `78ebbf3` before
anything was removed; orphan count fell from 12 to 10.

### Verification (production, 2026-08-12)

```
before   BROKEN — 1    Seizing Initiative / Introduction
                       uid b7a202b5… does not exist in Cloudflare Stream
after    BROKEN — none. 24 episodes + 2 module embeds healthy.
```

The repointed lesson plays. That also exercised the signed-URL path successfully for the
first time in production — the only episode configured to use it had been the broken one.

### Files

**Added:** `scripts/audit-stream-links.mjs`
**Changed:** `src/lib/server/stream.ts`, `src/lib/server/stream.test.ts`,
`src/routes/admin/+page.server.ts`, `src/routes/admin/lessons/+page.server.ts`

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| mid-level dev | 5.0     | $50  | $250.00     |
| **Total**     | **5.0** |      | **$250.00** |

---

## 2026-08-12 · Tooling · Local development environment repair

**Commits:** `ccfbb90`, `ce6ac8d`

### Why

Local development was unusable from a clean clone. Every route returned
`503 Service temporarily unavailable`, and the local database had no schema. Nothing in the
member UI could be built or reviewed until this worked.

### What was found

The Cloudflare adapter injects `wrangler.jsonc` vars into `platform.env` during local dev, and
`resolveRuntimeEnv` lets `platform.env` **overwrite** `process.env`. Anything declared in
`wrangler.jsonc` therefore cannot be changed from a shell variable or `.env`. Two consequences:

| symptom                                    | cause                                                        |
| ------------------------------------------ | ------------------------------------------------------------ |
| every route 503s                           | `ENVIRONMENT=production` engages the guard in `hooks.server` |
| `Invalid JWT Authorized party claim (azp)` | only production hosts in Clerk's `authorizedParties`         |

### What changed

- `wrangler.local.jsonc` — same D1/KV bindings, `ENVIRONMENT=development`, localhost as the
  canonical origin.
- `svelte.config.js` — selects it from `SHIVWORKS_LOCAL_DEV=1` **or** `dev` in argv. The argv
  fallback matters on Windows, where the inline `VAR=1 cmd` syntax in an npm script does not
  set the variable, so the fix would otherwise have failed for the owner.
- `package.json` — `pnpm dev` now selects the local config directly. Gating the working setup
  behind a separate `dev:local` was the wrong call; the default command should not be the
  broken one. Added `migrate:local`, since the existing `migrate` targets `--remote`, i.e.
  production, and should not be the only migrate command available.
- `CONTRIBUTING.md` — local setup documented, including the migration step a clean clone
  needs, the Clerk development-instance keys, and the fact that Clerk's dashboard shows
  Next.js variable names while SvelteKit drops the `NEXT_` prefix. Also flags the `pnpm
migrate` footgun and corrects a stale reference to `network.shivworks.com`, a domain never
  launched.

### Verification (local, 2026-08-13)

```
$ pnpm dev  → 200, no guard, no Clerk error
$ pnpm build → succeeds; production output contains zero localhost references
   vite dev   → wrangler.local.jsonc      vite build → wrangler.jsonc
```

Build and deploy paths are unaffected: `vite build` matches neither condition.

### Not billed

Environment repair is a precondition for the approved work rather than part of it.

| Role          | Hours   | Rate | Subtotal  |
| ------------- | ------- | ---- | --------- |
| mid-level dev | 2.5     | $50  | $125.00   |
| **Total**     | **2.5** |      | **$0.00** |

---

## 2026-08-11 · INV-011.1 · App shell parity (Sidebar · Nav · Footer)

**Wave:** aug-2026-parity
**Invoice:** INV-011, line item 1
**Commit:** `01b9130`
**Audit:** `.planning/ui-audits/shell.md`

### Why

First surface of the member UI parity round. Sequenced ahead of the individual pages
because the shared frame renders on all six of them — porting it first means none of the
pages get touched twice.

### What was found

The shell was **already ported**, which the estimate had not assumed. `src/app.css` and the
handoff's `shivworks.css` declare an identical token set — same faces, same
`--color-accent: #bc1313`, same surfaces, radii and shadows — and `app.css:1` already
imports the exact Google Fonts URL the handoff uses. A class-inventory diff (the handoff
builds its sidebar from a JS string with inlined base64, so a line diff is meaningless)
found Footer identical, Nav a superset, and Sidebar matching throughout.

### What changed

- **`src/app.html`** — removed the `Space Grotesk` / `Space Mono` stylesheet request. No
  rule in a 7,460-line stylesheet names either face; the real three are imported by
  `app.css`. Both `preconnect` hints kept — they warm the request `app.css` actually makes.
  A render-blocking request removed for nothing.
- **`Sidebar.svelte`** — `sidebar-progress-wrap` moved out of `sidebar-footer` to sit
  between the primary and secondary nav groups, matching the handoff. Left outside `<nav>`
  so it is not announced as a navigation landmark. CSS verified to target the class
  standalone rather than as a descendant of `.sidebar-footer`, and `margin-top: auto` still
  pins sign-out to the bottom.
- **Registry** — `nav` and `footer` → `PORTED-CLEAN`. `Sidebar` was recorded
  `NOT-PORTED` under `missing_components` despite shipping since June; corrected to
  `PARTIAL` with the divergence recorded.

### Deliberate omission

The handoff carries a second user-card face, `uc-face.uc-stats`, holding **Hrs / Streak /
TP**. All three are gamification metrics. `Sidebar.svelte` receives only `coursesStarted`,
`coursesTotal` and `memberRank`, and gamification is known to return zero on paid
production accounts. Porting this face would render `0 Hrs / 0 Streak / 0 TP` on every
authenticated page — promoting a defect that currently appears in one place into permanent
furniture. It ships with the separately-scoped gamification rework, when the numbers are
true.

Equally, the mobile affordances this repo carries and the handoff lacks (`sw-sheet` bottom
sheet, `sb-more-tab`, `sb-mobile-hide`, the `nav-mobile-*` menu) were **not** removed to
reach parity. The handoff is a desktop artefact; deleting working responsive behaviour to
match it would be a regression sold as a port.

### Verification (local, 2026-08-11)

```
$ pnpm check → 5468 files, 0 errors, 0 warnings
$ pnpm lint  → 0 errors (warnings all pre-existing rule classes)
$ pnpm test  → 59 files, 365 tests, 365 passed
$ WC_WEBHOOK_SECRET=$(openssl rand -hex 24) pnpm dev --port 5199
$ curl -s http://127.0.0.1:5199/ → 200, 328 KB
    site-nav / nav-actions / nav-actions-desktop / beta-badge  present
    site-footer / footer-inner / footer-brand / footer-legal / fda-card  present
    "Space+Grotesk" occurrences: 0
    "family=Archivo…" import present
```

Nav and Footer render on public routes, so both were confirmed visually. Sidebar renders
only on authenticated routes and **could not be confirmed** — see the blocker below.

### Blocker discovered — local auth

The six member surfaces in this round are all behind `requireEntitled`, which redirects to
Clerk when there is no session, and no development bypass exists in the codebase. Visual
confirmation of Sidebar and of every remaining page in INV-011 requires either Clerk
**development**-instance keys plus one member account with active access, or a Cloudflare
preview deploy.

This is the same blocker recorded against INV-003b and `HANDOFF-FOR-AARON.md` decision #2,
open since 2026-05 and never resolved. Resolving it also revives the auth-gated smoke suite.

### Second finding — local dev was hard-blocked

`pnpm dev` returned `503 Service temporarily unavailable (configuration error)` on every
route. Cause: `wrangler.jsonc` sets `ENVIRONMENT: "production"` in `vars`, the adapter
injects those into `platform.env` during local dev, and `resolveRuntimeEnv` lets
`platformEnv` **overwrite** `process.env` — so the production guard in `hooks.server.ts`
engages locally and setting `ENVIRONMENT=development` in the shell is silently clobbered.

`validateProductionSecrets` checks exactly one value, and `WC_WEBHOOK_SECRET` is not in
`wrangler.jsonc`, so supplying it via the environment does pass through:

```
WC_WEBHOOK_SECRET=$(openssl rand -hex 24) pnpm dev
```

`playwright.config.ts` launches `pnpm preview` with no `env` block, so `pnpm smoke` fails
the same way — every spec asserts 200 against a 503. Worth a follow-up: a `preview:local`
script and a `webServer.env` entry would fix both permanently. Not done here; out of the
approved scope and logged rather than silently absorbed.

### Files

**Added:** `.planning/ui-audits/shell.md`

**Changed:**

- `src/app.html` — dead font request removed
- `src/lib/components/Sidebar.svelte` — progress pill repositioned
- `.planning/ui-registry.json` — `nav`/`footer` → `PORTED-CLEAN`, `Sidebar` → `PARTIAL`

### Hours

| Role          | Hours   | Rate | Subtotal   |
| ------------- | ------- | ---- | ---------- |
| mid-level dev | 0.5     | $50  | $25.00     |
| **Total**     | **0.5** |      | **$25.00** |

Estimated at 2.5 hrs, delivered in 0.5. **2.0 hrs released.** Proposed reallocation: move
them to `library`, whose shipped index is a 31-line placeholder against a fully designed
handoff page and is the largest genuine gap of the six. Owner approval required before
`invoices.json` is amended — unchanged total, better allocation.

---

## 2026-08-11 · Phase 0 · Registry reactivation + approved-scope entry

**Wave:** aug-2026-parity
**Invoices:** INV-010 (`ESTIMATE` $350.00), INV-011 (`ESTIMATE` $650.00)
**Commit:** `344c51e`
**Spec ref:** `.planning/UI-ENGINE.md`, `.planning/README.md` § Estimate vs final

### Why

The tracking apparatus built during intake — `ui-registry.json`, this ledger, and the
`invoices.json` → `render.mjs` pipeline — all still work, but nothing has been written to
them since 2026-06-01. With no record being kept, delivered work became invisible to the
owner, which was raised directly as the single largest barrier to continuing the engagement.

Two shipped member surfaces and all four admin pages had never been registered at all. That
is not incidental: the admin pages are exactly where UI drift was later observed and
reported, while the member pages that _were_ registered did not drift. Restoring the
register is therefore the cheapest available control, not bookkeeping.

Nothing new was built here. The existing system was turned back on.

### What changed

- **Six pages added to `ui-registry.json`** (14 → 20 entries):
  - `course` → `/library/[slug]` — the course/episode player, previously untracked
  - `updates` → `/updates` — previously untracked
  - `admin`, `admin_lessons`, `admin_analytics`, `admin_webhooks` — new `admin` graphviz
    cluster; all four registered `STUB` pending an owner decision on scope
- **Seven surfaces claimed** as `CLAIMED · suzuki · 2026-08-11`: `nav`, `footer`,
  `dashboard`, `library`, `community`, `course`, `updates`.
- **`landing` and `welcome` deliberately left unclaimed.** The approved design handoff
  contains no Welcome page; `index.html` in the handoff is the public landing page. Porting
  Welcome would mean inventing a design the client has not approved, which UI-ENGINE §1
  forbids. Owner decision pending — substitute Landing, or supply a Welcome design.
- **`our_lines` populated** for every claimed surface, giving a real before-figure to
  measure each port against.
- **INV-010 / INV-011 entered** in `invoices.json` at $50/hr — the working rate for this
  engagement per `DEV-ONBOARDING.md` — for 20.0 billable hours totalling the $1,000 approved
  and paid on 2026-08-11.
- **62 MB of chat-shared attachments removed from the working tree** and `.gitignore`
  extended to stop them recurring. A 33 MB screen recording, a 29 MB design archive, a
  356 KB admin prototype and a folder of another client's product documents were sitting
  untracked in the repo root — one `git add -A` away from entering history, where large
  binaries cannot practically be removed again. Nothing referenced them. All were moved
  out to the reference folder beside the design handoff rather than deleted; the only
  discard was a byte-identical duplicate of the admin prototype (md5 verified).

### Deviation

`render.mjs` regenerates all invoice HTML, and its template has drifted from the committed
output of INV-001–008 (~1,950 lines of purely cosmetic difference). Those eight files were
reverted after rendering so this change set contains only INV-010 and INV-011. Regenerating
the historical eight is a separate, clearly-labelled commit for whoever wants it.

### Verification (local, 2026-08-11)

```
$ pnpm check   → 5468 files, 0 errors, 0 warnings
$ pnpm lint    → 0 errors, 334 warnings (all pre-existing)
$ pnpm test    → 59 files, 365 tests, 365 passed
$ node .planning/invoices/render.mjs
  INV-010    7.0 hrs     $350.00  Video pipeline reliability
  INV-011   13.0 hrs     $650.00  Member UI parity
  TOTAL     54.0 hrs   $5,460.00
```

A semantic diff of the registry against `HEAD` confirms the 14 pre-existing page entries
changed only in `our_lines`, `port_status`, `port_owner` and `port_owner_claimed_at`;
`missing_components`, `status_legend` and `docs` are byte-identical.

### Files

**Added:**

- `.planning/invoices/INV-010-feat-stream-pipeline-reliability.html`
- `.planning/invoices/INV-011-ui-member-parity.html`

**Changed:**

- `.planning/ui-registry.json` — 6 pages added, 7 claimed, `updated_by` → `suzuki`
- `.planning/invoices/invoices.json` — INV-010, INV-011
- `.planning/LEDGER.md` — this entry
- `.gitignore` — root-anchored ignores for `*.mp4`, `*.mov`, `*.zip`, `*.pdf`,
  `Telegram Desktop/`, `attachments/`. Anchored to the repo root so the tracked media
  under `static/videos/` is unaffected — verified with `git check-ignore -v`.

### Hours

| Role          | Hours   | Rate | Subtotal  |
| ------------- | ------- | ---- | --------- |
| mid-level dev | 1.0     | $50  | $50.00    |
| **Total**     | **1.0** |      | **$0.00** |

**Not billed.** Restoring the register is how this engagement stays accountable; charging
for it would be charging the client to be told what they paid for. Standard rate shown for
reference only. The $1,000 remains wholly allocated to INV-010 and INV-011.

---

## 2026-05-26 · INV-003a · Public-route smoke tests (Playwright)

**Wave:** wave-3
**Invoice:** INV-003 (a-half — auth-gated split deferred as INV-003b)
**PR:** `Mxcks:test/playwright-public` (open)
**Spec ref:** spec 01 §5, sop section-\* test bars

### Why

A CI pipeline (INV-006) without real end-to-end checks is a typecheck-and-lint gate dressed up as quality assurance. Smoke tests catch the failure modes typecheck cannot see: a SvelteKit route that builds clean but throws at render, a server load function that crashes against the production adapter, a navigation rewrite that takes the home page to 404. This PR ships the public-route half of the smoke suite — the auth-gated half (INV-003b) is blocked on Aaron provisioning Clerk dev-instance test users.

### What was built

- **`@playwright/test` 1.60** installed + Chromium downloaded.
- **`playwright.config.ts`** — boots `pnpm build && pnpm preview --port 4173 --host 127.0.0.1` as `webServer`, single Chromium project, 30s test timeout, 5s expect timeout, CI gets 2 retries, list + HTML reporters. Dummy Clerk keys injected via `webServer.env` so the build does not require real secrets.
- **`tests/smoke/public.spec.ts`** — six assertions:
  1. `/` — 200, non-empty body, no `Error:` leakage, title matches `/ShivWorks/i`.
  2. `/welcome` — same.
  3. `/login` — same.
  4. `/signup` — same.
  5. `/checkout` — same.
  6. `/sitemap.xml` — 200, content-type contains `xml`, body contains `<urlset`.
- **`package.json` scripts:**
  - `pnpm smoke` — one-command run.
  - `pnpm smoke:headed` — headed Chromium for debugging.
  - `pnpm smoke:report` — opens the last HTML report.
- **`.gitignore`** — added `playwright-report/` + `test-results/` so artifacts don't pollute commits.
- **CI workflow** (`.github/workflows/ci.yml`) — smoke job replaced from echo placeholder to real Playwright execution. Browser cache keyed on `pnpm-lock.yaml` hash; cold-cache installs `--with-deps chromium`, cache-hit installs OS deps only (~30s vs ~3min). Failure uploads the HTML report as a 7-day artifact for inspection.

### Verification (local, 2026-05-26)

```
$ pnpm smoke
Running 6 tests using 1 worker
  ok 1  /          (3.8s)
  ok 2  /welcome   (1.0s)
  ok 3  /login     (1.1s)
  ok 4  /signup    (0.9s)
  ok 5  /checkout  (1.0s)
  ok 6  sitemap    (0.3s)
  6 passed (59.1s total — 39s build + 8s smoke + setup)
```

### Thursday-morning runbook (for Max — 2026-05-28)

1. Open PowerShell.
2. `cd E:\dev\clients\outerfields\shivworks-network`
3. `git pull` (no-op if nothing has landed on the branch overnight).
4. `pnpm smoke`
5. Expected: 6 passed, ~60 seconds. On failure, `pnpm smoke:report` opens the HTML report with screenshots + traces.

Nothing else is required. The webServer is internal to Playwright — no separate dev server to start, no env file to populate (dummy keys are baked into `playwright.config.ts`).

### Deferred to INV-003b

- Auth-gated specs (`/dashboard`, `/library`, `/community`, `/settings`, `/vip-calls`) — blocked on Aaron + Alex provisioning Clerk dev-instance test users (member / vip / admin) and confirming the credential model (passwords in CI secrets vs Clerk testing-tokens API).
- `tests/smoke/global-setup.ts` — will sign in via Clerk, persist `storageState` per role, point each auth-gated spec at the right state file. Provisional 3 hrs once Clerk creds exist.

### Deviation from spec

Spec 01 §5 listed `/, /login, /signup, /welcome, /checkout, /sitemap.xml` for public smoke — all 6 shipped. Spec also implied splitting public + auth-gated into separate spec files; only public exists today, auth-gated arrives as `tests/smoke/auth-gated.spec.ts` in INV-003b.

### Files

**Added:**

- `playwright.config.ts`
- `tests/smoke/public.spec.ts`

**Changed:**

- `package.json` — `smoke` / `smoke:headed` / `smoke:report` scripts; `@playwright/test` devDep
- `pnpm-lock.yaml`
- `.gitignore` — Playwright artifact dirs
- `.github/workflows/ci.yml` — smoke job swapped from echo to real Playwright run with browser caching

### How to use / verify

```bash
pnpm install
pnpm exec playwright install chromium    # one-time, ~120 MB
pnpm smoke                               # ~60s on a cold cache
pnpm smoke:headed                        # debug a flaky test
pnpm smoke:report                        # open last HTML report
```

### Depends on

- INV-006 (CI workflow file exists so the smoke job can be wired into it)
- @sveltejs/adapter-cloudflare (already in repo) — `pnpm build` must produce a runnable preview

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| mid-level dev | 3.0     | $125 | $375.00     |
| **Total**     | **3.0** |      | **$375.00** |

### Pro-bono

Like the rest of the engagement, **amount billed: $0.00**. Standard rate shown for value reference.

---

## 2026-05-26 · INV-006 · CI pipeline + PR template

**Wave:** wave-3
**Invoice:** INV-006
**PR:** `Mxcks:ci/baseline-pipeline` (open)
**Spec ref:** spec 01 §6, sop 00 §3 + §4

### Why

Branch-protection rules can only enforce checks that GitHub knows about. Until a workflow runs against every PR, the SOP-required gates (check, lint, format, unit, smoke, build) are aspirational — a developer can merge a typecheck-failing or unformatted branch. This PR makes the gates real, machine-enforced, and parallel for sub-6-min PR feedback.

### What was built

- **`.github/workflows/ci.yml`** with 7 jobs:
  - `install` — pnpm 9.15 + node 20, frozen lockfile, store cached via `pnpm/action-setup` + `actions/setup-node`'s built-in pnpm cache (keyed on `pnpm-lock.yaml`).
  - `check` (svelte-check), `lint` (eslint), `format` (prettier --check), `unit` (vitest), `build` (vite + Cloudflare adapter) all run in parallel after `install`.
  - `smoke` is a placeholder echo job depending on `build`; it exists today so branch-protection rules referencing it can be configured in one shot. Filled by INV-003 (Playwright).
- **`concurrency`** with `cancel-in-progress: true` on PRs — a force-push cancels the prior run, no double-billed minutes. Push-to-main never cancels (we want every main commit gated).
- **Dummy Clerk keys** baked into the workflow `env` — `pk_test_Y2xlcmsuZXhhbXBsZS5kZXYk` (decodes to `clerk.example.dev$`, valid format Clerk's build-time validator accepts) + `sk_test_ci_dummy_not_a_real_secret`. Build needs these because `$env/static/public` is resolved at build time. Real secrets come from Doppler at deploy time, not CI build time.
- **`.github/PULL_REQUEST_TEMPLATE.md`** matching SOP §4 — What / Why / How / Risk / Testing / Ledger / PR-Invoice sections. Testing checklist includes a grep-for-secrets line as a copy-pasteable guard.

### Deviation from spec

Spec called for a single workflow with parallel jobs sharing an artifact from the install job. Real-world GitHub Actions caching is more efficient than artifact-passing when the pnpm store is cached, so each job runs `pnpm install --frozen-lockfile` on its own — cache-hot, this resolves in ~5–8 seconds. Total CI runtime expected at ~4 min on cache hit, ~6 min cold (within spec's "under 6 min" target).

### Files

**Added:**

- `.github/workflows/ci.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`

### How to use / verify

- Open any PR against this fork or upstream → workflow auto-runs.
- Watch the "Checks" tab; expect 7 jobs (1 install + 5 parallel + 1 smoke placeholder).
- Cache miss on first run (~5–6 min). Subsequent runs ~3–4 min.
- Branch-protection setup (separate, GitHub UI): require status checks `check`, `lint`, `format`, `unit`, `build`, `smoke`. Hold off on enabling until INV-003 fills the smoke job — until then, smoke trivially passes (echo step) which is technically a false green.

### Action items deferred to Aaron / Max

- **Enable branch protection** on `main` with required checks listed above. Cannot be done from this PR — it's a repo setting.
- **Replace CODEOWNERS placeholder handles** (INV-008 follow-up) before branch protection's "require CODEOWNER review" is enabled.

### Sentry sourcemap upload — explicitly deferred

Spec 03 §1 mentioned wiring `sentrySvelteKit()`'s sourcemap upload into the build job. Skipped from this PR because:

1. It requires `SENTRY_AUTH_TOKEN` to actually be in GitHub Actions secrets.
2. Adding it before that secret exists makes the build job fail.
   Tracked as **`feat/sentry-sourcemaps`** in the backlog — 30-min task once Aaron has the Sentry org and pastes the token.

### Depends on

- INV-001, INV-002 (lint + format + pre-commit configs must exist so the CI jobs have something to call).
- INV-004 + INV-005 (so the unit job covers the new error classifier tests).

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| mid-level dev | 3.5     | $125 | $437.50     |
| junior dev    | 0.5     | $85  | $42.50      |
| **Total**     | **4.0** |      | **$480.00** |

---

## 2026-05-26 · INV-005 · Error boundaries + handleError taxonomy

**Wave:** wave-2
**Invoice:** INV-005
**PR:** `Mxcks:feat/error-boundaries` (open)
**Spec ref:** spec 03 §2, §3, §5

### Why

Before this PR, an unhandled error in any route showed SvelteKit's default fallback page: a stack-trace-or-blank screen with no recovery path. For the **checkout** route specifically that was a revenue risk — a confused member would believe their card had been charged. Per-section `+error.svelte` boundaries give every surface a contextual recovery experience, surface a Sentry event ID for support handoff, and (for the admin surface) intentionally expose technical detail so admins can diagnose without leaving the page.

### What was built

- **Error taxonomy** (`src/lib/errors/codes.ts`) — 9-value `ERROR_CODES` enum matching spec 03 §3 (`AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `NOT_FOUND`, `INVALID_INPUT`, `RATE_LIMITED`, `PAYMENT_REQUIRED`, `UPSTREAM_FAILURE`, `INTERNAL_ERROR`, `CLIENT_ERROR`). String values are a stable public contract — analytics + alert rules key off them.
- **Classifier** (`src/lib/errors/classify.ts`) — `classify(error, status)` maps any thrown value into the taxonomy. HTTP status code first (most reliable, since SvelteKit's `error()` helper sets it explicitly), falling back to message-string sniffing for unexpected throws, with a dedicated branch for upstream-vendor names (Stripe, Clerk, Resend, Stream, Cloudflare) → `UPSTREAM_FAILURE`. Plus `ERROR_HEADLINES` map for boundary-UI copy.
- **Classifier tests** (`src/lib/errors/classify.test.ts`) — 5 test cases covering status-code mapping, message-string fallback, upstream-vendor detection, unknown-error fallback, and status-over-message precedence. All pass.
- **`src/app.d.ts`** — added the `App.Error` interface so `$page.error` is typed with `{ message, code?, eventId? }` everywhere it's read.
- **Server `handleError`** (`src/hooks.server.ts`) — refactored into a shared `buildErrorPayload(error, event, status)` function used by both the Sentry-wrapped and plain code paths. Calls `classify()` to set the code, reads `Sentry.lastEventId()` (no-op when DSN unset) for the eventId, logs via `logError` with the classified code as context.
- **Client `handleError`** (`src/hooks.client.ts`) — same eventId augmentation so client-thrown errors also surface a Sentry report ID in the boundary UI.
- **7 `+error.svelte` boundaries:**
  - `src/routes/+error.svelte` — root fallback, generic copy keyed off `ERROR_HEADLINES[code]`.
  - `src/routes/dashboard/+error.svelte` — refresh button + link to library.
  - `src/routes/checkout/+error.svelte` — **revenue-critical copy**: "Your payment was not charged. No money has moved." Email-support fallback. Orange status color to signal "important but not catastrophic".
  - `src/routes/library/+error.svelte` — branches on NOT_FOUND vs other.
  - `src/routes/community/+error.svelte` — emphasizes Circle community itself is up.
  - `src/routes/vip-calls/+error.svelte` — branches on 403 (AUTH_FORBIDDEN) → upgrade CTA vs other errors.
  - `src/routes/admin/+error.svelte` — monospace font, exposes message + code, includes "view event in Sentry" link. Member-tier users never reach this because they get a 403 boundary first.
- Every boundary surfaces a **Report ID** (Sentry event id) when present, so a member emailing support can quote it.

### Deviation from spec

None substantive. Spec §2 listed boundaries for `dashboard`, `checkout`, `library`, `community`, `vip-calls`, and `admin` — all built. Spec also mentioned an "authed route group" boundary which doesn't exist in the current route tree, so skipped.

### Svelte 5 / `$app/state` reactivity note

First draft used `$:` reactive declarations against `page.error` and `page.status`. ESLint surfaced `svelte/no-immutable-reactive-statements` because `$app/state`'s `page` export is already reactive in Svelte 5 — wrapping it in `$:` is redundant. Rewrote all 7 files to reference `page.error` and `page.status` directly in the template. This is the canonical Svelte 5 pattern. No `$derived` needed because the template-level reads are sufficient.

### Files

**Added:**

- `src/lib/errors/codes.ts`
- `src/lib/errors/classify.ts`
- `src/lib/errors/classify.test.ts` (5 new tests, all passing)
- `src/routes/+error.svelte`
- `src/routes/dashboard/+error.svelte`
- `src/routes/checkout/+error.svelte`
- `src/routes/library/+error.svelte`
- `src/routes/community/+error.svelte`
- `src/routes/vip-calls/+error.svelte`
- `src/routes/admin/+error.svelte`

**Changed:**

- `src/app.d.ts` — added `App.Error` interface
- `src/hooks.server.ts` — `buildErrorPayload` helper, classify-based code, eventId from Sentry
- `src/hooks.client.ts` — eventId added to client error payload

### How to use / verify

```bash
pnpm check  # 0 errors (5366 files)
pnpm test   # 53 pass (was 48; +5 from classify.test.ts)
pnpm lint   # exit 0
```

Manual smoke: load `/dashboard` while logged out → guard redirects to login (not a boundary). Throw a synthetic error from `dashboard/+page.server.ts` load() → dashboard boundary renders with refresh CTA. Repeat for checkout (most important — verifies revenue-protective copy).

### Depends on

- INV-004 (Sentry SDK + `logError` helper).
- SvelteKit 2 `App.Error` namespace augmentation pattern (already supported by current `@sveltejs/kit` version).

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| mid-level dev | 4.5     | $125 | $562.50     |
| senior dev    | 0.5     | $175 | $87.50      |
| **Total**     | **5.0** |      | **$650.00** |

---

## 2026-05-26 · INV-004 · Sentry SDK wiring (no-op mode pending DSN)

**Wave:** wave-2
**Invoice:** INV-004
**PR:** `Mxcks:feat/sentry` (open)
**Spec ref:** spec 03 §1, §5

### Why

Production errors today vanish — `hooks.server.ts` silently swallows member-hydration failures via `console.error` (the user gets bounced to `/checkout` with no incident logged). Webhook signature failures also disappear into stdout. Sentry gives the team minutes-not-hours MTTD on every uncaught error, with a stack trace, the affected user's ID, and a session replay video on the client side.

### What was built

- **`@sentry/sveltekit`** installed. No `@sentry/vite-plugin` — `@sentry/sveltekit` already ships its own vite plugin (`sentrySvelteKit()`). Will be wired in INV-006 (CI pipeline) once sourcemap upload is needed.
- **`src/hooks.client.ts`** (new) — conditional `Sentry.init()` gated on `PUBLIC_SENTRY_DSN`. Replay integration on errors only (100% on-error, 0% normal sessions), text + media masked so PII doesn't ship. Exports `handleError` that wraps Sentry's `handleErrorWithSentry` only when DSN is set; otherwise a plain handler. Both paths preserve console.error in browser dev tools.
- **`src/hooks.server.ts`** (rewritten) — pulled the existing handle into a named `shivworksHandle`; the exported `handle` is `sequence(Sentry.sentryHandle(), shivworksHandle)` when DSN set, else just `shivworksHandle`. Added server-side `Sentry.init()` (same conditional gate). Tags the Sentry scope with `clerkUserId` + `route` on every request. Exported `handleError` per spec 03 §3 — logs via `logError` AND captures to Sentry, returns a safe `{ message, code }` shape.
- **`src/lib/server/log.ts`** (new) — `logError(scope, err, ctx)` writes a JSON line to stderr (CF Workers picks this up) and calls `Sentry.captureException` with `scope` as a tag. `logWarning` sibling for non-error signals. The Sentry calls are safe no-ops when DSN is absent.
- **Silent-swallow fix in `hooks.server.ts`** (spec 03 §5) — replaced `console.error('Failed to hydrate authenticated ShivWorks member', error)` with `logError('hooks.member-hydrate', error, { clerkUserId: auth.userId })`. Request still continues with `event.locals.user = null` (so the user reaches `/checkout` instead of hard-failing), but now the incident is visible.
- **Webhook log migration** — `api/stripe/webhook/+server.ts` and `api/clerk/webhook/+server.ts` swapped their `console.error` calls for `logError('stripe.webhook.verify', …)` and `logError('clerk.webhook', …)`. These two are the highest-value migrations (failure here = silently-lost paid customers).
- **`.env.example`** — appended `PUBLIC_SENTRY_DSN`, `PUBLIC_SENTRY_ENV`, `SENTRY_AUTH_TOKEN` documentation. All three commented out by default so existing setups keep working unchanged.

### Deviation from spec

Spec 03 §1 referenced `$env/static/public` for DSN env vars. SvelteKit's static env errors at build time if a referenced var doesn't exist anywhere in `.env` — which would block builds on any developer that hasn't created a Sentry project yet. Switched to `$env/dynamic/public` (runtime read, undefined if unset) so the no-op gate works on a fresh clone with no Sentry account. This is the **right** way to handle optional integrations and should propagate to similar wiring elsewhere (Resend optionality, Stream optionality).

### Console.error scope

Spec mentioned 11 sites. Migrated 3 highest-value (silent swallow + 2 webhook verifiers). The other 7 server-side sites (`d1-compat.ts`, `clerk.ts`, `email/service.ts`, `admin/+page.server.ts`) are deferred to a focused **`sec/log-migration`** follow-up. The .svelte file console.errors stay — those are client-side dev-tooling logs, separately captured by the client `handleError`.

### Files

**Added:**

- `src/hooks.client.ts`
- `src/lib/server/log.ts`

**Changed:**

- `src/hooks.server.ts` — wrapped with sentryHandle, exported handleError, swapped silent swallow for logError
- `src/routes/api/stripe/webhook/+server.ts` — added logError import, swapped 1 console.error
- `src/routes/api/clerk/webhook/+server.ts` — same pattern
- `.env.example` — Sentry vars documented (commented out)
- `package.json`, `pnpm-lock.yaml` — `@sentry/sveltekit` added

### How to use / verify

**No-op verification (current state):**

```bash
pnpm install
pnpm check    # 0 errors
pnpm test     # 48 tests pass
pnpm lint     # exit 0
pnpm build    # ships zero Sentry network traffic in built bundle
```

**End-to-end verification (after Aaron creates Sentry project):**

1. Aaron creates a free Sentry SvelteKit project at sentry.io.
2. Aaron pastes the DSN into Doppler `prd` as `PUBLIC_SENTRY_DSN` + sets `PUBLIC_SENTRY_ENV=production`.
3. Next Cloudflare Pages build picks up the var; Sentry init activates.
4. Trigger a test error from any server route (e.g. `throw new Error('test')` in a load function), confirm it shows in Sentry with `route`, `clerkUserId`, `scope` tags within ~30s.
5. For CI sourcemap upload (separate setup): add `SENTRY_AUTH_TOKEN` (Sentry organization auth token, scope `project:releases`) to GitHub Actions secrets. Will be wired in INV-006.

### Depends on

- `@sentry/sveltekit` (newly added)
- INV-001 + INV-002 (lint/format baseline + hook — so the new files clear CI)

### Follow-up tickets created

- `sec/log-migration` — migrate the remaining 7 server-side `console.error` sites to `logError`. Provisional 1.5–2 hrs.
- `feat/sentry-sourcemaps` (or fold into INV-006) — wire `@sentry/vite-plugin` (or `sentrySvelteKit()` from the SvelteKit package) into `vite.config.ts` so the CI build uploads sourcemaps. Requires `SENTRY_AUTH_TOKEN` in CI secrets.

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| mid-level dev | 4.0     | $125 | $500.00     |
| **Total**     | **4.0** |      | **$500.00** |

---

## 2026-05-26 · INV-008 · Governance (CODEOWNERS + Dependabot + CONTRIBUTING)

**Wave:** wave-1
**Invoice:** INV-008
**PR:** `Mxcks:chore/governance` (open)
**Spec ref:** spec 01 §7, sop 00

### Why

Three governance artifacts that turn the SOP from "documented expectation" into "enforced by the platform":

- **CODEOWNERS** lets GitHub auto-request the right reviewer when sensitive paths change, and underwrites the branch-protection rule that requires CODEOWNER approval for those paths.
- **Dependabot** keeps dependencies current without anyone having to remember to check — prevents the long-tail of unpatched CVEs that breach reports start with.
- **CONTRIBUTING.md** gives new contributors the one-page summary so they don't have to read the full SOP to ship their first PR.

### What was built

- `.github/CODEOWNERS` — global fallback plus targeted owners for auth (`clerk.ts`, `guards.ts`, `session-security.ts`, login/signup/settings, clerk webhook), payments (`stripe/*`, `checkout/`), database + migrations, infrastructure (`wrangler*`, `.env.example`, replit configs), CI (`.github/`, `scripts/`), and engineering standards (`.planning/`, lint/prettier configs). All handles are placeholders (`@TBD-alex`, `@TBD-aaron-or-max`, `@TBD-max-stern`) — must be replaced with real GitHub usernames before branch protection is enabled.
- `.github/dependabot.yml` — npm + GitHub Actions ecosystems, weekly Monday 8am Chicago. Minor/patch grouped to keep PR volume low; majors get their own PR. `@types/*` grouped separately. Wrangler majors ignored (CF changes APIs across minors).
- `CONTRIBUTING.md` — contributor-facing distillation of SOP 00. Setup commands, branch naming, commit format, hook behavior, ledger requirement, where-to-look index. Links back to `.planning/sops/` for the full procedure.

### Files

**Added:**

- `.github/CODEOWNERS`
- `.github/dependabot.yml`
- `CONTRIBUTING.md`

### How to use / verify

- CODEOWNERS: when branch protection is enabled with "Require review from Code Owners", GitHub auto-requests review per matching pattern. Verify via "Files changed" tab on a PR touching e.g. `migrations/` — Alex should be auto-requested.
- Dependabot: first PRs appear within one week of merge to `main`. Verify via `https://github.com/createsomethingtoday/shivworks-network/network/updates`.
- CONTRIBUTING.md: linked from README (will add in a future docs PR) and from the PR template (INV-006).

### Pre-merge action required (from Aaron / Alex)

Replace the four `@TBD-*` placeholder handles in CODEOWNERS with real GitHub usernames:

- `@TBD-alex` — the ShivWorks dev's GH handle
- `@TBD-aaron-or-max` — primary owner GH handle (Aaron's, or Macks Studios if Aaron prefers to delegate)
- `@TBD-max-stern` — Max's GH handle (`@Mxcks`)

Until placeholders are replaced, CODEOWNERS auto-requests are silently dropped (GitHub ignores unknown handles).

### Depends on

- None for the files themselves.
- Branch protection rules (configured in GitHub UI) are the actual enforcement layer — out of scope here, documented as a separate setup step for Aaron in the post-Wave-3 task list.

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| junior dev    | 1.0     | $85  | $85.00      |
| mid-level dev | 1.0     | $125 | $125.00     |
| **Total**     | **2.0** |      | **$210.00** |

---

## 2026-05-26 · INV-002 · Pre-commit hooks (simple-git-hooks + lint-staged)

**Wave:** wave-1
**Invoice:** INV-002
**PR:** `Mxcks:chore/pre-commit` (open)
**Spec ref:** spec 01 §3

### Why

With ESLint + Prettier in place (INV-001), nothing yet forces a developer to run them before pushing. CI catches violations on the server but only after a round-trip — ~3–5 min wasted per failed run. A client-side pre-commit hook auto-fixes what it can and blocks the commit when it can't, keeping bad code from leaving the developer's machine.

### What was built

- `simple-git-hooks` chosen over Husky to avoid Husky's postinstall script and `.husky/` directory churn. `simple-git-hooks` writes a plain `.git/hooks/pre-commit` shell script.
- `lint-staged` runs the right tool against only the staged-file globs:
  - `*.{ts,svelte,js,mjs,cjs}` → `eslint --fix` then `prettier --write`
  - `*.{md,json,yml,yaml,css,html}` → `prettier --write`
- `prepare` npm script auto-installs the hook on `pnpm install`, so a fresh clone needs no manual setup.
- Hook respects an emergency bypass via the standard `SKIP_SIMPLE_GIT_HOOKS=1` env var (built into the tool) and the universal `git commit --no-verify` — both should only be used per SOP §8 hotfix flow.

### Smoke test (verified)

Created a deliberately ugly file with double quotes and weird spacing:

```ts
const x = 'bad style';
console.log(x);
```

Staged it, ran `git commit`. Hook auto-rewrote in flight to:

```ts
const x = 'bad style';
console.log(x);
```

…and committed the corrected version. Test file then removed.

### Files

**Changed:**

- `package.json` — added `prepare` script, `simple-git-hooks` block, `lint-staged` block, 2 new devDeps
- `pnpm-lock.yaml`

### How to use / verify

```bash
pnpm install            # installs the hook automatically (prepare script)
# Hook is now active. To verify:
ls .git/hooks/pre-commit   # exists, executable, calls "pnpm lint-staged"

# Emergency bypass (use only per SOP §8):
SKIP_SIMPLE_GIT_HOOKS=1 git commit ...
# or
git commit --no-verify ...
```

### Depends on

- INV-001 (`eslint.config.js` + `.prettierrc.json` must exist for lint-staged to call them)
- pnpm 9+

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| junior dev    | 0.75    | $85  | $63.75      |
| mid-level dev | 0.75    | $125 | $93.75      |
| **Total**     | **1.5** |      | **$157.50** |

---

## 2026-05-26 · INV-001 · Lint + Format baseline

**Wave:** wave-1
**Invoice:** INV-001
**PR:** `Mxcks:chore/eslint-prettier-baseline` (open)
**Spec ref:** spec 01 §1, §2

### Why

The repo shipped to date with no enforced style or static-analysis baseline. Reviewers were re-litigating tabs-vs-spaces and missing easy correctness wins (unused vars, target-blank tabnabbing, missing each-keys). This PR establishes the floor every future PR clears before merge.

### What was built

- ESLint flat config with `@eslint/js` + `typescript-eslint` + `eslint-plugin-svelte` v3 recommended profiles.
- Registered the SvelteKit ambient `App` namespace as a readonly global so `no-undef` passes on `App.Locals`, `App.Platform`, etc.
- Prettier config matching the repo's existing style observed in `hooks.server.ts` (tabs, single quotes, 100-col).
- `.editorconfig` so non-Prettier editors get the same defaults.
- `pnpm` scripts: `lint`, `lint:fix`, `format`, `format:check`.
- One-time codebase reformat applied across 136 files in a separate commit (kept atomic for clean `git blame`).

### Deviation from spec

The original spec held `svelte/no-target-blank`, `svelte/require-each-key`, `svelte/no-navigation-without-resolve`, `svelte/no-dom-manipulating`, and `svelte/no-useless-mustaches` at `error`. Enabling them surfaced 154 pre-existing findings — 15 are real security findings (`no-target-blank` tabnabbing), 30 are real correctness findings (missing each-keys), the rest are SvelteKit-2 stylistic preferences. Fixing all inline would balloon a 3.5-hour baseline PR into 10+ hours and touch every page.

All five rules are **downgraded to `warn`** so the baseline ships green and warnings stay visible. The 15 `no-target-blank` security findings will be addressed in a focused follow-up PR (provisional `sec/tabnabbing-pass` — backlog).

### Files

**Added:**

- `eslint.config.js`
- `.prettierrc.json`
- `.prettierignore`
- `.editorconfig`

**Changed:**

- `package.json` — 4 scripts, 8 devDeps added
- `pnpm-lock.yaml`
- 136 files reformatted by Prettier (atomic reformat commit)

### How to use / verify

```bash
pnpm install
pnpm lint           # exits 0, prints 151 warnings (pre-existing)
pnpm format:check   # exits 0
pnpm format         # rewrites any non-conforming file
pnpm check          # svelte-check, 0 errors 0 warnings
```

### Depends on

- pnpm 9.15+ (already in `packageManager`)
- node 20+ (uses ESLint 10 flat config)

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| mid-level dev | 3.5     | $125 | $437.50     |
| **Total**     | **3.5** |      | **$437.50** |

### Follow-up tickets created

- `sec/tabnabbing-pass` (provisional) — fix 15 `svelte/no-target-blank` instances, promote rule back to `error`.
- `chore/each-key-pass` (provisional) — fix 30 `svelte/require-each-key` instances, promote rule back to `error`.

---

This file answers the question **"why is this thing here, who added it, and how do I use it?"** without needing to read commits or PRs.

---

## Entry format

Every entry follows this exact structure. The format is invoice-grade — at the end of each wave, `.planning/invoices/render.mjs` reads structured fields from these entries to regenerate the final PR-Invoice HTML files with **actual** hours and **actual** file lists (the pre-execution invoices are estimates).

```markdown
## YYYY-MM-DD · <short-title>

**Wave:** <pre-wave-1 | wave-1 | wave-2 | wave-3 | wave-4 | post-wave>
**Invoice:** <INV-XXX | none — tooling>
**PR:** <Mxcks#N upstream→ csm#M, or "branch only">
**Spec ref:** <spec 01 §3, sop 00 §7, etc. — or "none">

### Why

1–3 sentences. The business or engineering need this satisfies. Not the implementation.

### What was built

Bullet list of the concrete things added/changed. Imperative-mood, past-tense.

### Files

**Added:**

- path/to/file
  **Changed:**
- path/to/file
  **Deleted:**
- path/to/file

### How to use / verify

Exact command(s) or step(s). A reader copies and runs.

### Depends on

- prerequisite tool, env var, prior ledger entry, or "none"

### Hours

| Role          | Hours   | Rate | Subtotal    |
| ------------- | ------- | ---- | ----------- |
| mid-level dev | 1.5     | $125 | $187.50     |
| **Total**     | **1.5** |      | **$187.50** |
```

### Rules

1. **Append-only.** Never edit or delete prior entries. Corrections go in a new entry that references the old one.
2. **One entry per merged change.** A PR that ships 3 distinct scripts produces 3 entries (or one entry that lists all 3 if they're tightly coupled).
3. **Hours are actuals, not estimates.** Record the time the work actually took, even if it ran over or under the invoice estimate.
4. **Cross-reference the invoice.** Each entry names the invoice it rolls up into. If an entry is pure toolkit work (sync scripts, ledger format itself), set `Invoice: none — tooling`.
5. **PR SOP §7 enforces this.** Every PR must add at least one ledger entry before merge unless explicitly waived as `docs:` or `chore: planning`.

---

## 2026-05-26 · LEDGER.md format established

**Wave:** pre-wave-1
**Invoice:** none — tooling
**PR:** chore/bootstrap-ledger (open)
**Spec ref:** none

### Why

Specs describe _intent_, invoices describe _cost_. Neither answers "what is currently sitting in this repo and why?" — that's the ledger's job. Without it, six months from now nobody can read a config file and tell whether it's load-bearing or vestigial.

### What was built

- Authored `.planning/LEDGER.md` with the entry-format contract above.
- Documented append-only rule + invoice-cross-reference rule.

### Files

**Added:**

- `.planning/LEDGER.md`

### How to use / verify

Read this file top-down. Newest entry is what just shipped.

### Depends on

- none (kicks off the ledger system)

### Hours

| Role          | Hours   | Rate | Subtotal   |
| ------------- | ------- | ---- | ---------- |
| mid-level dev | 0.5     | $125 | $62.50     |
| **Total**     | **0.5** |      | **$62.50** |

---

## 2026-05-26 · scripts/sync-upstream.{ps1,sh} — Upstream sync helper

**Wave:** pre-wave-1
**Invoice:** none — tooling
**PR:** chore/bootstrap-ledger (open)
**Spec ref:** none

### Why

The work for all 4 waves happens on `Mxcks/shivworks-network` (fork) and lands upstream at `createsomethingtoday/shivworks-network` via cross-repo PRs. The fork's `main` must stay in lockstep with upstream so each wave branch produces a clean diff for reviewers. This script automates the fetch + fast-forward + push cycle that keeps the fork mergeable.

### What was built

- `scripts/sync-upstream.ps1` for Windows / PowerShell.
- `scripts/sync-upstream.sh` for Codespaces / Unix / WSL.
- Both refuse to run if the working tree is dirty (prevents losing local changes).
- Both fast-forward only — never merge or rebase (prevents accidental history rewrites).

### Files

**Added:**

- `scripts/sync-upstream.ps1`
- `scripts/sync-upstream.sh`

### How to use / verify

```powershell
pwsh scripts/sync-upstream.ps1
```

```bash
bash scripts/sync-upstream.sh
```

Both print the new `main` SHA on success. If the working tree is dirty they exit 1 with a clear message.

### Depends on

- `git` on PATH
- `upstream` remote configured: `git remote add upstream https://github.com/createsomethingtoday/shivworks-network.git`

### Hours

| Role       | Hours   | Rate | Subtotal   |
| ---------- | ------- | ---- | ---------- |
| junior dev | 0.5     | $85  | $42.50     |
| **Total**  | **0.5** |      | **$42.50** |

---

## 2026-05-26 · SOP 00 §7 — ledger entry now required on merge

**Wave:** pre-wave-1
**Invoice:** none — tooling
**PR:** chore/bootstrap-ledger (open)
**Spec ref:** sop 00 §7

### Why

Without enforcement, the ledger drifts out of date within weeks. Tying ledger updates to the PR merge process keeps the ledger permanently current.

### What was built

- Updated `.planning/sops/00-pull-requests.md` § 7 (Post-merge) to require: _"every PR that adds or modifies a script/config/automation/feature appends one entry to LEDGER.md before merge."_
- Documented the waiver path for pure `docs:` and `chore: planning` PRs that ship no executable artifact.

### Files

**Changed:**

- `.planning/sops/00-pull-requests.md`

### How to use / verify

Reviewer checklist (SOP §5) now includes "ledger entry present?" — the PR reviewer enforces.

### Depends on

- `.planning/LEDGER.md` exists.

### Hours

| Role          | Hours    | Rate | Subtotal   |
| ------------- | -------- | ---- | ---------- |
| mid-level dev | 0.25     | $125 | $31.25     |
| **Total**     | **0.25** |      | **$31.25** |

---

## 2026-05-26 · Pre-execution invoices stamped ESTIMATE

**Wave:** pre-wave-1
**Invoice:** none — tooling
**PR:** chore/bootstrap-ledger (open)
**Spec ref:** none

### Why

The 8 invoices rendered in commit `b88ac1d` are forecasts. Hours and file lists are projections. To prevent the client mistaking estimates for finals, the rendered HTMLs are marked **ESTIMATE — pre-execution** at the top stamp. Final invoices regenerated post-wave from ledger actuals.

### What was built

- Set `STATUS_STAMP` default in `.planning/invoices/invoices.json` from `DRAFT` to `ESTIMATE — pre-execution`.
- Added a note line to `.planning/README.md` clarifying estimate vs final.
- Re-ran `node .planning/invoices/render.mjs` to refresh all 8 HTML files.

### Files

**Changed:**

- `.planning/invoices/invoices.json`
- `.planning/README.md`
- `.planning/invoices/INV-001-chore-eslint-prettier-baseline.html`
- `.planning/invoices/INV-002-chore-pre-commit.html`
- `.planning/invoices/INV-003-test-playwright-smoke.html`
- `.planning/invoices/INV-004-feat-sentry.html`
- `.planning/invoices/INV-005-feat-error-boundaries.html`
- `.planning/invoices/INV-006-ci-baseline-pipeline.html`
- `.planning/invoices/INV-007-sec-hardening-pass-1.html`
- `.planning/invoices/INV-008-chore-governance.html`

### How to use / verify

Open any `.planning/invoices/INV-*.html` in a browser — top-right stamp reads `ESTIMATE — pre-execution`.

### Depends on

- existing `.planning/invoices/render.mjs` pipeline.

### Hours

| Role          | Hours    | Rate | Subtotal   |
| ------------- | -------- | ---- | ---------- |
| mid-level dev | 0.25     | $125 | $31.25     |
| **Total**     | **0.25** |      | **$31.25** |
