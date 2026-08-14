# UI Engine — ShivWorks Network (Port Engine)

> Single source of truth for any UI change. **Aaron designed every launch-critical page in `E:\dev\clients\outerfields\shivworks-demo`.** The engine's job is not to invent designs — it's to port Aaron's canonical work into this codebase, verify it, and ship it.
>
> Every agent (human or AI) working on UI **must read this file first** and **claim the page they're touching** before making changes. Without the engine, parallel work collides and brand drifts.

---

## How to use the engine

1. **Pick a page from the Page Index Map below.** Default to the highest-priority page with `port_status: NOT-PORTED` or `STUB`.
2. **Claim it.** Set `port_status: CLAIMED · <your-id> · <ISO date>` in the registry. If it's already claimed, pick a different page.
3. **Open Aaron's canonical version** at the path in `pages[].aaron_canonical_file` (relative to `shivworks-demo`). Read the whole file. Note any imports of components our repo doesn't have yet.
4. **Compare against our current page** (`pages[].file`). Diff in your head: structure, copy, data shape, missing components.
5. **Write a port plan** at `.planning/ui-audits/<slug>.md` using the Port Audit Checklist below. List: components to bring over, server-load changes, brand-token references, anything that needs Max's call.
6. **Execute the port** — edit the `.svelte` file (and its `+page.server.ts` if data shape changed) to match Aaron's canonical version. Adapt anything that's wrong for our build (different env vars, different libs, etc.).
7. **Verify** — `pnpm check` clean + page renders at `http://localhost:5173/<route>`.
8. **Open PR** — title `ui(<page-slug>): port Aaron's canonical design`.
9. **Close out** — registry sync ritual.

If you need to port a component used by multiple pages, claim every page that consumes it.

---

## The Registry — canonical source of truth

**File:** `.planning/ui-registry.json`

The registry is the **single machine-readable source of truth**. The Page Index Map below is rendered from it for humans, but if the two disagree, the registry wins. Always read the registry first, modify it in-place, then update derived artifacts (this map + the GraphViz sitemap).

The registry tracks **two orthogonal status axes per page** — important not to conflate them:

| Axis | Tracks | Values | Lives in |
|---|---|---|---|
| `port_status` | Where this page is in the port pipeline | NOT-PORTED / STUB / CLAIMED / PARTIAL / NEEDS-VERIFY / PORTED-CLEAN / DIVERGED / LOCKED | the registry only |
| `graphviz.status` | Whether the page exists in shipped code right now | `g` 🟢 SHIPPED / `y` 🟡 PENDING / `r` 🔴 NOT BUILT / `w` ⚪ EXTERNAL | registry + GraphViz `SCREENS` array |

A page can be `graphviz.status=g` (shipped code exists) AND `port_status=STUB` (our shipped page is a stub or wrong brand). That's where most pages sit right now — they render, but they're either the old warm-gold style or a `ComingSoon` placeholder where Aaron has a real impl.

### Port status vocabulary (use these exact strings)

- `NOT-PORTED` — Aaron has a designed version, our codebase has nothing
- `STUB` — our codebase has a placeholder (ComingSoon, redirect, or old-brand version); Aaron has a real designed page
- `CLAIMED · <agent-id> · <ISO date>` — someone is actively porting
- `PARTIAL` — port underway, structure landed but components/data wiring incomplete
- `NEEDS-VERIFY` — port committed locally, needs Max review
- `PR · #<n>` — PR open
- `PORTED-CLEAN` — verified, matches Aaron's intent, working in our codebase
- `DIVERGED · <reason>` — intentionally different from Aaron's (rare; requires explicit Max approval and a reason)
- `LOCKED · <reason>` — do not touch

### Status mapping rule

When a `port_status` change has implications for shipped code, update the graphviz status at the same time:

| port_status transition | graphviz.status change |
|---|---|
| any → PR | no change (PR not merged yet) |
| PR → PORTED-CLEAN, page was STUB before | `y` → `g` (if it was a real stub) or stays `g` |
| PR → PORTED-CLEAN, page was NOT-PORTED before | `r` → `g` |
| PR → PORTED-CLEAN, page already shipped | `g` stays `g` |
| any → LOCKED with reason "deferred-post-launch" | usually `r` or `y` |

---

## Page Index Map (derived from the registry)

This table is a **human-readable view of the registry**. Source the values from `.planning/ui-registry.json` `pages[]`. Update this table in-place after every registry change — **never as a comment, never as prose**.

| # | Page | Route | Our file | Aaron canonical | Port Status | Owner | GraphViz |
|---|---|---|---|---|---|---|---|
| 1 | Landing | `/` | `src/routes/+page.svelte` | `src/routes/+page.svelte` (2289 ln) | STUB | — | 🟢 g |
| 2 | Welcome | `/welcome` | `src/routes/welcome/+page.svelte` | `src/routes/welcome/+page.svelte` (276 ln) | STUB | — | 🟢 g |
| 3 | Dashboard | `/dashboard` | `src/routes/dashboard/+page.svelte` | `src/routes/dashboard/+page.svelte` (787 ln) | STUB | — | 🟢 g |
| 4 | Library | `/library` | `src/routes/library/+page.svelte` | `src/routes/library/+page.svelte` (282 ln) | STUB | — | 🟢 g |
| 5 | Community | `/community` | `src/routes/community/+page.svelte` | `src/routes/community/+page.svelte` (463 ln) | STUB | — | 🟢 g |
| 6 | Find Partners | `/find-partners` | `src/routes/find-partners/+page.svelte` | `src/routes/find-partners/+page.svelte` (252 ln) | PORTED-CLEAN · PR #31 | — | 🟢 g |
| 7 | Account | `/account` | `src/routes/account/+page.svelte` | `src/routes/account/+page.svelte` (263 ln) | PORTED-CLEAN · PR #31 | — | 🟢 g |
| 8 | Messages | `/messages` | `src/routes/messages/+page.svelte` | `src/routes/messages/+page.svelte` (214 ln) | STUB | — | 🟡 y |
| 9 | Leaderboard | `/leaderboard` | `src/routes/leaderboard/+page.svelte` | `src/routes/leaderboard/+page.svelte` (157 ln) | STUB | — | 🟡 y |
| 10 | Checkout | `/checkout` | `src/routes/checkout/+page.svelte` | `src/routes/checkout/+page.svelte` (186 ln) | STUB | — | 🟢 g |
| 11 | Login | `/login/[...rest]` | `src/routes/login/[...rest]/+page.svelte` | (Clerk-hosted) | LOCKED · clerk-managed | — | 🟢 g |
| 12 | Signup | `/signup/[...rest]` | `src/routes/signup/[...rest]/+page.svelte` | (Clerk-hosted) | LOCKED · clerk-managed | — | 🟢 g |
| 13 | Nav (global) | n/a | `src/lib/components/Nav.svelte` | `src/lib/components/Nav.svelte` | STUB | — | n/a |
| 14 | Footer (global) | n/a | `src/lib/components/Footer.svelte` | `src/lib/components/Footer.svelte` | STUB | — | n/a |

### Missing components (Aaron's repo has, we don't)

Tracked separately because they unlock multiple pages. Pull these as a dependency when their first consumer page gets ported:

- `CustomVideoPlayer.svelte` — used by dashboard, library, episode pages
- `DmListener.svelte` — direct-messaging realtime
- `EpisodePlayer.svelte` — library episode playback
- `MockAuthPanel.svelte` — dev-only mock auth (probably skip for launch)
- `OnboardingChecklist.svelte` — used by welcome / dashboard
- `Sidebar.svelte` — global nav rail (impacts every page)
- `TrainingStatus.svelte` — used by dashboard

---

## Cross-references — existing artifacts the engine composes with

Don't duplicate these. Read them, link to them from the registry, keep them in sync.

| Artifact | Path | What it covers | Relationship to engine |
|---|---|---|---|
| **Aaron's canonical repo** | `E:\dev\clients\outerfields\shivworks-demo` | The source of truth for every launch-critical page design + Brand v2.2 globals | The engine ports from here. Read-only — never edit Aaron's repo directly. |
| **Aaron's app.css** | `shivworks-demo\src\app.css` (2225 ln) | Brand v2.2 globals: tokens + component patterns + section layout system | The brand-swap PR replaces our `src/app.css` with this file at the end of the port sweep. |
| Section SOPs | `.planning/sops/section-<slug>.md` | Per-section backend contract | Linked per page via `pages[].section_sop` in the registry. |
| GraphViz Flow Board | `.planning/architecture/LAUNCH-FLOW-BOARD-GRAPHVIZ.html` | Interactive sitemap with persona filtering | The engine updates this file's `SCREENS` array whenever a page's `graphviz.status` or `cluster` changes. |
| Aaron Sitemap | `.planning/architecture/AARON-SITEMAP.md` | Aaron's port-time frontend inventory | Historical reference. Frozen — do not edit. |

---

## Brand Reference (Aaron's v2.2 — the target)

**Source:** `shivworks-demo/src/app.css`. This is the brand the engine ports TO. Our current `src/app.css` (warm gold + Space Grotesk) will be replaced by Aaron's globals once every page is ported. Until then, ported pages may carry inline `<style>` blocks using Aaron's tokens directly.

### Colors

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0b0b0b` | page background |
| `--color-bg-alt` | `#131313` | section backgrounds |
| `--color-bg-alt-2` | `#191919` | elevated section backgrounds |
| `--surface` | `#131313` | default panel (solid, no gradient) |
| `--surface-elevated` | `#191919` | elevated panel |
| `--surface-strong` | `#1f1f1f` | strongest panel |
| `--color-fg-primary` | `#ffffff` | headlines, body text |
| `--color-fg-secondary` | `#d4d4d4` | secondary text |
| `--color-fg-muted` | `#a3a3a3` | captions, meta |
| `--color-accent` | `#bc1313` | primary accent (red) |
| `--color-accent-strong` | `#8b0e0e` | secondary accent (deeper red) |
| `--color-accent-soft` | `rgba(188,19,19,0.12)` | accent fill |
| `--color-border` | `rgba(255,255,255,0.08)` | borders (white-tint, not accent-tint) |
| `--color-border-strong` | `rgba(255,255,255,0.16)` | emphasized borders |
| `--color-rule` | `rgba(255,255,255,0.08)` | hr / dividers |
| `--color-error` | `#f0ab93` | error text |

### Typography

- Display: **FF Good Pro** (commercial; falls back to Inter, Helvetica Neue, Arial, sans-serif)
- Heading: **Industry** (then FF Good Pro, then Inter)
- Body: **Industry** (then Inter)
- Mono: **JetBrains Mono** (then SF Mono, ui-monospace)
- Headings use `letter-spacing: -0.04em` (tight) and `line-height: 0.98` with `text-wrap: balance`
- Hero h1: `clamp(3rem, 7vw, 5.8rem)`, max-width `10.5ch`
- Section h2: `clamp(1.8rem, 4vw, 2.75rem)`
- Eyebrows: **mono font**, `letter-spacing: 0.14em`, `font-size: 0.72rem`, accent color

### Radii (sharp, not soft)

- `--radius-button: 4px` — buttons are nearly square-cornered
- `--radius-card: 8px` — declared, though `.panel` actually uses `1.55rem` (~25px) — Aaron's chosen panel radius is more generous than the card token
- Pills: `999px`

### Surfaces

- Solid colors (NOT gradients) — `#131313`, `#191919`, `#1f1f1f`
- `--shadow-card` — `0 28px 84px rgba(0,0,0,0.42)`
- `--shadow-accent` — soft red glow `0 0 0 1px rgba(188,19,19,0.16), 0 24px 60px rgba(0,0,0,0.32)`
- `.panel::before` — red gradient top border accent strip on every panel

### Layout

- `--container-max: 1200px`
- `.section-block` padding: `clamp(2.8rem, 7vw, 5rem) 0`
- Hero padding: `clamp(4rem, 10vw, 7rem) 0 2.5rem`
- `.hero-grid` two-column: `minmax(0, 1.08fr) minmax(0, 0.92fr)`, gap `1.5rem 1.75rem`
- Hero body text: line-height `1.72`, font-size `1.07rem`, max-width `60ch`

### Component patterns

- `.eyebrow` — mono uppercase, accent color, `letter-spacing: 0.14em`
- `.card-eyebrow` — same shape, secondary fg color
- `.hero-pill` — mono uppercase, `999px` radius, white-tint background
- `.btn-primary` — red fill, white text, mono uppercase, `4px` radius, red shadow
- `.btn-secondary` — 2.5% white background, white-tint border, mono uppercase, `4px` radius
- `.ghost-link` — secondary fg color, no padding
- `.panel` — `1.55rem` padding + radius, solid surface, red gradient top accent
- `.card-grid` — 3 columns default with `1.15rem` gap

---

## Port Audit Checklist

Apply this to every page being ported. Output one Markdown file per page at `.planning/ui-audits/<slug>.md`.

### Structural fidelity
- [ ] All sections present in Aaron's version exist in the port
- [ ] Section order matches Aaron's flow
- [ ] Hero / panel / card patterns align with Aaron's component classes
- [ ] No sections invented that aren't in Aaron's canonical

### Content fidelity
- [ ] Copy comes from Aaron's source, not invented
- [ ] Real ShivWorks curriculum names used (MUC, Wrestling, Live Fire, Clinch Pick, Push Dagger, Foundational Modules, Core Skills, PCC, Grounded Strategy, Edged Weapons Overview, Handgun IFWA)
- [ ] Real tier names + pricing (Bronze $249 from $499, VIP pricing per `VIP_TIER`)
- [ ] Real cohort dates if surfaced (no invented dates)

### Brand fidelity
- [ ] Uses Aaron's tokens (red, Industry/FF Good Pro, sharp 4px buttons)
- [ ] No old warm-gold tokens (`#d1b27a`, `#9b673c`) in new code
- [ ] No Space Grotesk references (it's an old brand)
- [ ] Inline `<style>` blocks scoped properly

### Component sync
- [ ] All components Aaron imports either (a) already in our repo or (b) tracked in the Missing Components list above
- [ ] No silent stubs — if Aaron's page imports `OnboardingChecklist` and we don't have it, the port plan calls it out

### Data wiring
- [ ] `+page.server.ts` returns the data shape Aaron's page expects
- [ ] Server load uses our `src/lib/server` functions, not Aaron's (their names + signatures may differ)
- [ ] Auth gates match Aaron's intent (paid/auth/public)

### Interactive states
- [ ] Every button works (not a stub) OR is explicitly a disabled placeholder
- [ ] Every link goes somewhere real
- [ ] Hover states preserved from Aaron's version

### A11y (minimum bar)
- [ ] All images have alt text
- [ ] Heading hierarchy: one h1 then h2s
- [ ] Form fields have labels
- [ ] Color contrast meets WCAG AA

### Build
- [ ] `pnpm check` clean
- [ ] `pnpm build` clean
- [ ] Route returns expected HTTP status (200 / 302 / 307) for the auth state being tested

---

## Engine sync ritual (run after every change)

Every SOP ends with the same closing sync. Do these in order, every time:

1. **Update `.planning/ui-registry.json`** — set the page's `port_status`, `port_owner`, `port_audit`, `port_pr`, and `our_lines`. Bump top-level `updated_at` and `updated_by`.
2. **Update the Page Index Map table in this file** to match the registry.
3. **If `graphviz.status` or `graphviz.cluster` changed** — also update the `SCREENS` array in `.planning/architecture/LAUNCH-FLOW-BOARD-GRAPHVIZ.html`.
4. **If routing changed** — update the `TRANSITIONS` array in the same HTML file.

Non-negotiable.

---

## SOP — port a page (the main flow)

Use this when porting Aaron's canonical version of a page into our codebase.

1. Find the page in the registry. Confirm `port_status: NOT-PORTED` or `STUB`.
2. **Claim** — `port_status: CLAIMED`, `port_owner: <your-id>`, `port_owner_claimed_at: <ISO now>`. Sync ritual.
3. **Read Aaron's canonical** at `aaron_canonical_file`. Read the whole file. Note every imported component.
4. **Write the port plan** at `.planning/ui-audits/<slug>.md`. Use the Port Audit Checklist.
5. **Pull any missing components** Aaron's page imports. Each missing component port follows the SOP below.
6. **Port the `.svelte` file** — copy Aaron's structure, adapt server-data references to our `src/lib/server` helpers.
7. **Port `+page.server.ts`** — match the data shape Aaron's page expects, sourcing from our DB helpers.
8. **Verify** — `pnpm check` + dev server renders. Set `port_status: NEEDS-VERIFY`. Sync ritual.
9. **Max reviews** the live page at `http://localhost:5173/<route>`.
10. **Open PR** — `ui(<page-slug>): port Aaron's canonical design`. `port_status: PR · #<n>`. Sync ritual.
11. **After merge** — `port_status: PORTED-CLEAN`. Update `graphviz.status` if it changed. Sync ritual.

## SOP — port a missing component

Use this when a page port needs a component our repo doesn't have yet.

1. Add a registry entry for the component (extend `pages[]` or add a `components[]` array; for now use `pages[]` with `route: null`).
2. **Claim** the component.
3. **Read Aaron's canonical** at `shivworks-demo/src/lib/components/<Name>.svelte`.
4. **Copy + adapt** the component into `src/lib/components/<Name>.svelte`. Adapt imports if our lib paths differ.
5. **Verify** — `pnpm check` clean.
6. **Open PR** OR include in the consuming page's PR if it's the only consumer.
7. Sync ritual.

## SOP — re-sync a page (Aaron updated his demo)

Use this when Aaron's canonical version changes and our port is now behind.

1. Open both files. Diff. Decide: full re-port or surgical patch.
2. **Claim** the page. `port_status: CLAIMED · re-sync`.
3. Apply the diff to our version.
4. Verify + PR + sync ritual.

## SOP — for a small tweak on a ported page

1. Confirm page is `PORTED-CLEAN` and you have an explicit reason to diverge.
2. **Claim** + `port_status: CLAIMED · tweak`.
3. Edit + verify + PR (`ui(<page-slug>): <one-line change>`).
4. After merge → `port_status: DIVERGED · <reason>` if the change moves us off Aaron's canonical, otherwise stays `PORTED-CLEAN`.

## SOP — the app.css swap (end of port sweep)

This is a one-time event. Run only when all launch-critical pages are `PORTED-CLEAN`.

1. **Verify pre-conditions** — every page in the Page Index Map is `PORTED-CLEAN` or explicitly `LOCKED`.
2. **Backup** — copy current `src/app.css` to `.planning/_archive/<date>-old-app.css`.
3. **Replace** — copy Aaron's `shivworks-demo/src/app.css` into `src/app.css`.
4. **Verify every page** still renders correctly. Any that don't — port their inline `<style>` blocks to reference the now-global tokens.
5. **Open PR** — `chore(brand): swap app.css to Aaron's v2.2 globals`.
6. **After merge** — all pages should now be visually consistent.

---

## What this engine is NOT

- Not a substitute for taste — the checklist catches mechanics, not magic.
- Not a substitute for testing — `pnpm check` + `pnpm build` are still mandatory before PR.
- Not a substitute for Max's review — Max signs off on ports before they become PRs.
- Not a license to invent — Aaron's source is the source. Engine work that wanders away from his canonical needs explicit `DIVERGED` status with a reason.

---

## Engine status

- **Created:** 2026-05-31 (design-engine v0; archived in `.planning/_archive/2026-05-31-pre-aaron-port-mockups/`)
- **Pivoted to port engine:** 2026-06-01
- **Author:** claude-launch-day
- **First worked example pending:** which page to port first is the next decision point
