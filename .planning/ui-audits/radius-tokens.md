# Corner Radius — Evidence Index

**Requested by:** Max, 2026-08-13 — _"the components and the corner radii should be static
across the entire page. I usually do 6px… the designs that I sent you might specify. If you
could give me that indexes as evidence, I'll check it."_
**Compiled by:** suzuki · 2026-08-13
**Sources:** `src/app.css` (shipped) and `shivworks-design/dashboard.html` (approved handoff)

---

## Short answer

You are right that it is inconsistent, and the designs do specify — but **the design is not
being ignored so much as it is itself inconsistent.** The handoff defines two radius tokens
and then uses fifteen different values. The shipped stylesheet inherited that and widened it
to twenty-six.

So "follow the design" will not fix this. Someone has to pick a standard.

---

## What both sides define

Identical, and correct on both sides:

```css
--radius-button: 4px;
--radius-card: 8px;
```

Verified byte-identical between `app.css` and the handoff.

## What both sides actually do

|                                  | approved design | shipped app |
| -------------------------------- | --------------: | ----------: |
| `border-radius` declarations     |              46 |         229 |
| distinct values used             |          **15** |      **26** |
| declarations using the tokens    |           **3** |      **13** |
| declarations hardcoding a number |        43 (93%) |   216 (94%) |

The proportions are almost the same. The implementation did not drift from the design; it
reproduced the design's habit at four times the volume.

---

## The component band

Excluding pills (`999px`), circles (`50%`) and square corners (`0`) — all legitimate — the
shipped app still carries **167 declarations across 22 distinct values**:

| value                                                          |     uses | example selector                  |
| -------------------------------------------------------------- | -------: | --------------------------------- |
| `6px`                                                          |   **37** | `.checkout-tier-urgency`          |
| `8px`                                                          |       21 | `.checkout-step`                  |
| `1rem`                                                         |       18 | form inputs                       |
| `3px`                                                          |       17 | `.beta-badge`                     |
| `5px`                                                          |       12 | `[data-tip]::after`               |
| `var(--radius-card)`                                           |       12 | `.panel`                          |
| `4px`                                                          |        8 | `.account-page label`             |
| `1.1rem`                                                       |        7 | `.link-card`                      |
| `10px`                                                         |        6 | `.coming-soon-compact-track`      |
| `7px`                                                          |        5 | `.lgh-icon`                       |
| `12px`                                                         |        4 | `.hero-media .trailer-tile-hero`  |
| `2px`                                                          |        3 | nav focus rings                   |
| `0.65rem`                                                      |        3 | `.account-page label.choice-tile` |
| `9px`                                                          |        2 | `.kebab-menu`                     |
| `1.2rem`, `1.15rem`, `0.75rem`, `0.6rem`, `0.95rem`, `0.85rem` | 1–2 each | assorted                          |
| `var(--radius-button)`                                         |    **1** | `.btn` and variants               |
| `16px 16px 0 0`                                                |        1 | `.sw-sheet-panel`                 |

Twelve of these sit between 2px and 12px — close enough that no one chose them deliberately,
far enough apart to read as sloppy at a glance. That is the effect being described.

---

## Your instinct, checked

**`6px` is the single most-used component radius on both sides** — 37 times in the shipped app
and 7 in the design, more than any other non-pill value. It is already the de facto standard;
it just was not written down, so nothing enforces it.

The declared token says `4px` for buttons and `8px` for cards. Neither matches the 6px that
dominates in practice, and `--radius-button` is referenced exactly **once** in the entire
stylesheet.

---

## Decision — settled 2026-08-13

Three options were put to the owner:

- **A** — adopt `6px` as a single component radius (most common in practice).
- **B** — keep `4px` / `8px` as the design declares, and enforce it.
- **C** — `6px` components, `8px` cards.

**Owner chose B: _"No, four and eight is fine."_** The declared tokens stand, and the 37
existing `6px` components move to them.

One caveat given at the same time: _"As long as some of those areas on the welcome page are
bigger than eight."_ That is compatible with B — it describes large containers, not an
exception to the component rule. Confirmation requested; see the open question below.

## The three bands

Not everything belongs to the two tokens. Sorting the 229 declarations by size gives three
distinct populations, and only the middle two are in scope:

| band        | values                           | count | treatment                                             |
| ----------- | -------------------------------- | ----: | ----------------------------------------------------- |
| **Shape**   | `999px`, `50%`, `0`, `inherit`   |    61 | Leave alone — pills, avatars, deliberate square edges |
| **Control** | `2px`–`5px`                      |    40 | → `var(--radius-button)`                              |
| **Card**    | `6px`–`12px`, `0.6rem`–`0.75rem` |    82 | → `var(--radius-card)`                                |
| **Surface** | `0.85rem`–`1.2rem` (13.6–19.2px) |    31 | **Held** — this is the "bigger than eight" set        |

The Surface band is mostly hero panels, modals and form inputs at 16px. Collapsing it to 8px
would flatten exactly the large areas the owner asked to keep rounder, so it is deliberately
excluded from this pass rather than guessed at.

## Execution

Split into two commits so the risky half is reviewable on its own:

1. **Zero-visual-change pass.** Declarations already at exactly `4px` or `8px` become
   `var(--radius-button)` / `var(--radius-card)`. Nothing moves on screen; token adoption
   rises from 13 to ~42.
2. **Normalisation pass.** The remaining Control and Card band values snap to their token.
   This one does change appearance — mostly `6px → 8px` on 37 components.

Then a lint rule rejecting a raw `border-radius` outside the Shape band, so it cannot drift
again. Without that the same erosion repeats; it is the durable half of the work and the
natural first entry in the UI guidelines.

## Open question

Should the Surface band (16px hero panels, modals, inputs) keep its current values, or does
the owner want a third token — say `--radius-surface: 16px` — so it is declared rather than
merely tolerated? Until answered, that band is untouched.
