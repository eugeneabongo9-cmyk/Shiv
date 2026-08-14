# Port Audit — App Shell (Sidebar · Nav · Footer)

**Canonical:** `design-handoff/` — the standalone HTML handoff dated 2026-08-05, approved by
the client. Supersedes the `shivworks-demo` source referenced in `sidebar.md` (2026-06-01).
**Targets:** `src/lib/components/Sidebar.svelte` (256L) · `Nav.svelte` (262L) ·
`Footer.svelte` (68L) · `src/app.html`
**Audited by:** suzuki · 2026-08-11
**Registry:** `nav`, `footer` — `CLAIMED · suzuki · 2026-08-11`
**Invoice:** INV-011, line item 1 (est. 2.5 hrs / $125)

---

## Method

Class-inventory diff rather than line diff. The handoff renders its sidebar from a
JavaScript string with inlined base64, so a textual comparison is meaningless. Both sides
were reduced to their tag/class trees and compared structurally.

---

## Headline finding — the shell is already ported

This does **not** need the rebuild the estimate assumed. The design system was ported in
full at some earlier point and never recorded:

- `src/app.css` and the handoff's `shivworks.css` declare an **identical token set** —
  same faces (`Archivo` / `Inter` / `JetBrains Mono`), same `--color-accent: #bc1313`,
  same surfaces, radii, shadows and scrollbar tokens.
- `app.css:1` already `@import`s the exact Google Fonts URL the handoff uses.

So there is no design system to bring across. What follows is the residual gap only.

### Footer — no work required

| | |
|---|---|
| Handoff classes | `site-footer`, `footer-inner`, `footer-brand`, `footer-block`, `footer-legal`, `brand`, `brand-mark`, `brand-copy`, `fda-card`, `container` |
| Shipped classes | **identical set** |

Structurally complete. Registry can go straight to `PORTED-CLEAN` after visual confirmation.

### Nav — no work required; shipped is a superset

Every handoff class is present (`site-nav`, `nav-inner`, `nav-links`, `nav-actions`,
`beta-badge`, `ghost-link`, `brand*`). The shipped component additionally carries a full
mobile menu — `nav-mobile-panel`, `-scrim`, `-toggle`, `-row`, `-signout` and nine siblings —
that the handoff has no equivalent for.

**Do not remove the mobile menu to "match the design."** The handoff is a desktop artefact;
deleting working responsive behaviour to reach parity with it would be a regression sold as
a port.

### Sidebar — one real gap, and it should not be closed yet

Structure matches through `app-sidebar` → `sidebar-inner` → `sidebar-brand` /
`sidebar-identity` / `sidebar-nav` / `sidebar-footer`, including `brand-mark`, `ln1`/`ln2`,
`user-card`, `uc-avatar`, `uc-face.uc-identity`, `sidebar-progress-*` and `sidebar-signout`.
The shipped version again adds mobile affordances the handoff lacks (`sw-sheet*` bottom
sheet, `sb-more-tab`, `sb-mobile-hide`).

Two differences:

| # | Difference | Verdict |
|---|---|---|
| 1 | Handoff has a second user-card face, `uc-face.uc-stats`, holding three `uc-stat` cells: **Hrs**, **Streak**, **TP** | **Do not port — see below** |
| 2 | Handoff places `sidebar-progress-wrap` between the primary and secondary nav; shipped nests it inside `sidebar-footer` | Cosmetic, trivial |

---

## Decision — hold `uc-face.uc-stats`

All three cells are gamification metrics. `Sidebar.svelte` receives only `coursesStarted`,
`coursesTotal` and `memberRank`; hours, streak and TP are not supplied to it, and the
underlying gamification data is known to return zero on paid production accounts.

Porting this face would therefore render **0 Hrs / 0 Streak / 0 TP on every authenticated
page** — taking a defect that currently appears in one place and promoting it to the
persistent furniture of the whole product. That is a visible regression dressed as a port.

Gamification rework is separately scoped and not part of the approved $1,000. This face
belongs to that work, and should ship in the same change that makes the numbers true.

**Recorded as a deliberate partial**, not an oversight. The registry entry keeps a
`divergence_reason` so the next person doesn't "fix" it back in.

---

## Actions

| # | Action | File |
|---|---|---|
| 1 | Move `sidebar-progress-wrap` to sit between the two `nav.sidebar-nav` blocks | `Sidebar.svelte` |
| 2 | Remove the `Space Grotesk` / `Space Mono` stylesheet request — nothing references either face. **Keep both `preconnect` hints**: `app.css` imports from the same two hosts, so they still warm the real request | `src/app.html` |
| 3 | Visually confirm `find_partners` and `account` (both `PORTED-CLEAN`) are unaffected | — |
| 4 | Registry → `PORTED-CLEAN` for `nav`, `footer`; Sidebar `PARTIAL` with divergence reason | `ui-registry.json` |

Action 2 is a small unforced win: the page currently blocks render on a font request for two
families that no rule in a 7,460-line stylesheet ever names.

---

## Estimate correction

INV-011 line 1 was estimated at **2.5 hrs** on the assumption the shell needed porting. It
does not. Honest revision:

| | Hours |
|---|---|
| Original estimate | 2.5 |
| Actual remaining work | **0.5** |
| Released | **2.0** |

**The 2.0 hours are not returned as cash — they move to `library`.** The shipped
`/library` index is a 31-line placeholder against a fully designed handoff page, and is by
some distance the largest genuine gap of the six surfaces. Its 2.0 hr estimate is
correspondingly light.

Net effect on the client: unchanged total, better allocation. Owner approval required
before the reallocation is written into `invoices.json`.
