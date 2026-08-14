# Design-System Gaps — for Claude Design

**Goal:** make every `(3)` design component transfer into the SvelteKit app **1:1** — copy the mockup markup, and it's already correctly styled because the class exists globally with the exact spacing. No hand-re-deriving CSS per page (that's what's been slow and drift-prone).

**Audience:** Claude Design (owner of `…/Shivworks (3)/assets/shivworks.css`).
**Source of truth going forward:** `shivworks.css` is the canonical design system. The app imports it globally; dev never re-writes component spacing.

---

## 1. The transfer contract (please build to this)

For a component to transfer exactly, ALL of the following must be true:

1. **Direct global classes.** Every component is styled by a **plain, stable class name** in `shivworks.css` (e.g. `.course-card`, `.dash-section`). No styling that lives only inside a page's `<style>`, no relying on element/tag selectors that only work in one page's DOM.
2. **Self-contained spacing.** A component's padding/gap/margins come from its own class — not from a parent page wrapper. If `.course-card` needs 1.1rem padding, that's on `.course-card`, not on `.library-page .card`.
3. **All tokens defined** in `:root` (see §2). No raw hex that should be a token.
4. **Responsive included** in the same file (the `@media` rules for that component live with it).
5. **No JS for layout.** JS may drive _behavior_ (e.g. the `.user-card` hover-flip, the `.sw-sheet` open state) but never spacing/structure. Markup must look right with JS off.
6. **Stable class names.** Do not rename classes between iterations — renames break the transfer. Add, don't rename.
7. **Icons are swappable.** We render icons with `lucide-svelte`, not your SVG sprite. Keep icon sizing on the class (`.x svg { width: … }`) so either source works.

If a component meets all 7, dev copies the markup and it's done.

---

## 2. Token gaps (add to `:root`)

The app already has your full token set **except one**:

| Token               | Status      | Note                                                                                         |
| ------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `--color-on-accent` | **MISSING** | text color on accent fills (badges). Define it (e.g. `#fff`). We're using a `#fff` fallback. |

All others present and matched: `--color-accent[-border/-soft/-strong]`, `--color-fg-[primary/secondary/muted/faint]`, `--color-brass[-deep]`, `--color-vip[-soft/-border]`, `--color-bg[-alt]`, `--color-border[-strong]`, `--color-rule`, `--surface[-elevated/-strong]`, `--shadow-[card/accent]`, `--radius-[card/button]`, `--font-[display/heading/body/mono]`. ✅

---

## 3. Component class gaps

These design classes are **NOT yet global** in the app — today they only exist as per-page scoped CSS (or not at all), which is why their spacing drifts. **Please make sure each is fully defined in `shivworks.css` with exact spacing** so we can lift them to the global sheet verbatim.

| Class                                                                           | Used by                | Status                                  |
| ------------------------------------------------------------------------------- | ---------------------- | --------------------------------------- |
| `.course-card` (+ `-body`, `-top`, hover, badges)                               | **library, dashboard** | ✗ missing-global — **highest priority** |
| `.dash-section`                                                                 | dashboard              | ✗ missing-global                        |
| `.panel-elevated`                                                               | dashboard, cards       | ✗ missing-global                        |
| `.site-nav`, `.nav-inner`, `.nav-links`, `.nav-actions`                         | top nav (landing/auth) | ✗ missing-global                        |
| `.footer-inner`, `.footer-brand`, `.footer-block`, `.footer-legal`, `.fda-card` | footer                 | ✗ missing-global                        |
| `.membership-badge`, `.beta-badge`                                              | nav, cards, account    | ✗ missing-global                        |
| `.kebab`, `.kebab-menu`                                                         | card menus             | ✗ missing-global                        |
| `.pf-bar`                                                                       | page-flow / progress   | ✗ missing-global                        |
| `.doc-chip`                                                                     | docs/updates           | ✗ missing-global                        |

**Already global + matched** (transfer works today): `.app-sidebar` + all `.sidebar-*` / `.user-card` / `.uc-*` / `.sw-sheet*` (just shipped), `.panel`, `.tag`, `.media-ph` (+inner/label), `.progress-track`/`-fill`, `.grid-2/3/4`, `.row-header`, `.field`, `.field-row`, `.toggle`, `.choice`/`-grid`, `.btn`/`-primary`/`-secondary`/`-ghost`, `.ghost-link`, `.eyebrow`, `.section-block`, `.section-heading`, `.detail-pill`, `.settings-section`/`-row`/`-actions`, `.idx`. ✅

---

## 4. Naming alignment (already reconciled — keep these)

| Use                 | Canonical (design = app)                                                           |
| ------------------- | ---------------------------------------------------------------------------------- |
| Member sidebar root | `.app-sidebar` (not `.sidebar`)                                                    |
| Active nav state    | `.sidebar-nav-item.active` (a real `.active` class, **not** a `--active` modifier) |
| Admin nav entry     | `.sidebar-nav-item--admin` (with the `::after` "ADMIN" badge)                      |
| Mobile overflow     | `.sb-more-tab` + `.sw-sheet*`                                                      |

Please keep these names. Earlier app code used `.sidebar` / `--active`; that's now fixed to match you.

---

## 5. Per-page class manifest (so we can pre-verify a transfer)

For each page, these are the **component classes its markup uses**. Before we transfer a page, every class here must exist in `shivworks.css`. ✅ = already global, ✗ = needs §3.

| Page                              | Key component classes                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `index.html` (landing)            | `.site-nav`✗ `.nav-*`✗ `.hero*` `.feature-card` `.price-card` `.faq-*` `.footer-*`✗ `.btn`✅ `.tag`✅ |
| `dashboard.html`                  | `.dash-section`✗ `.course-card`✗ `.panel`✅ `.media-ph`✅ `.tag`✅ `.progress-track`✅                |
| `library.html`                    | `.course-card`✗ `.media-ph`✅ `.tag`✅ `.row-header`✅ `.progress-track`✅ filter chips               |
| `course.html`                     | `.player*` `.module-list`/`-item` `.mi-*` `.media-ph`✅ `.tag`✅ `.sidebar-progress*`✅               |
| `training-profile.html`           | `.tp-*` `.field`✅ `.choice`✅ `.toggle`✅ `.panel`✅ `.progress-track`✅                             |
| `settings.html`                   | `.settings-section`✅ `.settings-row`✅ `.toggle`✅ `.field`✅ + theme/accent prefs (`prefs.css`)     |
| `partners.html`                   | member cards `.tag`✅ `.field`✅ `.choice`✅ filter rail                                              |
| `profile.html` (dossier)          | stat tiles `.panel`✅ rank ladder `.tag`✅ `.media-ph`✅                                              |
| `updates.html`                    | tabbed list `.doc-chip`✗ `.media-ph`✅ `.tag`✅                                                       |
| `community.html`                  | channels/feed/members rail (chat — backend-gated)                                                     |
| `leaderboard.html`                | standings table `.tag`✅ `.membership-badge`✗                                                         |
| `messages.html` / `live.html`     | DM / stream shells (backend-gated)                                                                    |
| `admin.html` / `admin-login.html` | `.panel`✅ tables `.field`✅ `.btn`✅ `.kebab`✗                                                       |

---

## 6. What we (dev / Claude Code) need from Claude Design

1. **One file**: keep `shivworks.css` the single canonical stylesheet. We import it globally (after our token base). When you change a component, change it there.
2. **Close the §3 gaps**: ensure `.course-card`, `.dash-section`, `.panel-elevated`, top-nav `.site-nav/.nav-*`, `.footer-*/.fda-card`, `.membership-badge/.beta-badge`, `.kebab*`, `.pf-bar`, `.doc-chip` are all fully defined with exact spacing + their `@media` rules.
3. **Add `--color-on-accent`** to `:root` (§2).
4. **A class manifest** (even a comment header per component block: `/* COMPONENT: course-card — used by library, dashboard */`) so we can grep and verify coverage.
5. **Don't rename** existing classes; only add.
6. **Flag JS-driven bits** explicitly (e.g. `.user-card` flip, `.sw-sheet` open) so we wire behavior, not layout.

With that, transferring a whole page becomes: paste your markup → swap your `<svg><use>` icons for `lucide-svelte` → wire the dynamic values → done. No CSS re-derivation.

---

## 7. Status

- ✅ **Sidebar/shell** already lifted to global + rebuilt to match you verbatim (`app.css` "APP SHELL" section + `Sidebar.svelte`).
- ⏭ **Next** (once §3 lands or we lift from your current file): `.course-card` → fixes Library/Dashboard drift; then top-nav + footer; then per-page.
