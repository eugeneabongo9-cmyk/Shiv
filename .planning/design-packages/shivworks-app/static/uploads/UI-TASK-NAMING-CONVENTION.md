# UI Task Naming & Formatting Convention

**For: Claude Design (and anyone adding UI tasks to this repo).**
Follow this exactly so UI tasks slot cleanly into the existing task system (`w###`, `B#`, `F1–F13`, `DENIS-VERIFY`).

---

## 1. Task ID format

```
UI-<AREA>-<NN>
```

- **`UI-`** — fixed prefix, marks it a UI task
- **`<AREA>`** — the surface it touches (table below)
- **`<NN>`** — zero-padded sequence within that area (01, 02, …)

**Examples:** `UI-DASH-01` · `UI-LIB-03` · `UI-NAV-02`

### Area codes (match the real routes/components)

| Code   | Surface                               |
| ------ | ------------------------------------- |
| `LAND` | `/` landing                           |
| `WELC` | `/welcome`                            |
| `DASH` | `/dashboard`                          |
| `LIB`  | `/library` (+ `/library/[slug]`)      |
| `ACCT` | `/account`                            |
| `FIND` | `/find-partners`                      |
| `CHK`  | `/checkout`                           |
| `AUTH` | `/login` `/signup` (ClerkMount)       |
| `NAV`  | Nav / Sidebar / Footer (global shell) |
| `COMP` | Shared component (not route-specific) |
| `GATE` | ComingSoon / gated-route shell        |

New area? Add a row here first, then use it.

---

## 2. Task title format

```
[UI-AREA-NN] <imperative verb> <what> — <where>
```

- Start with a verb: **Add, Fix, Polish, Build, Align, Animate, Responsive, Empty-state, Restyle**
- Keep under ~80 chars

**Good:** `[UI-DASH-02] Add empty-state for zero continue-watching — /dashboard`
**Bad:** `dashboard looks bad` (no ID, no verb, no surface)

---

## 3. Required fields (every task)

```markdown
### [UI-DASH-02] Add empty-state for zero continue-watching — /dashboard

- **Surface:** /dashboard (DashboardContinueWatching.svelte)
- **Type:** empty-state # layout | component | state | responsive | motion | copy | a11y
- **Priority:** P0 # P0 launch-blocking | P1 soon | P2 nice-to-have
- **Description:** A brand-new member with no watch history currently sees a blank panel. Show a friendly prompt + CTA to the library.
- **Acceptance:** Fresh account (no progress) shows the empty-state, not a blank/broken panel; renders correct at 375 / 768 / 1440px.
- **Design ref:** Aaron demo repo `src/routes/dashboard/+page.svelte` OR Figma link OR screenshot path
- **Status:** ⬜
- **Depends on / DENIS-VERIFY:** ↳ B1 (repo access); verify against live theme tokens
```

### Field rules

- **Type** — one of: `layout` `component` `state` `responsive` `motion` `copy` `a11y`
- **Priority** — `P0` (blocks launch) · `P1` · `P2`. Default P1 unless told otherwise.
- **Acceptance** — must be **observable/testable**. Always state the breakpoints (`375 / 768 / 1440px`) for any visual task, and "fresh account" for any state that varies by user.
- **Design ref** — never "make it look good." Point to Aaron's demo repo path, a Figma frame, or a screenshot file. No ref → flag it, don't guess.
- **Status** — `⬜ todo` · `🔄 in-progress` · `👀 review` · `✅ done`

---

## 4. Status & tags (reuse existing conventions)

- **In code:** when you touch a file that needs human review, drop `// DENIS-VERIFY (UI-DASH-02): <what to check>` — greppable, consistent with the rest of the repo.
- **Blocked tasks:** tag with the blocker ID from `LAUNCH-EXECUTION-BREAKDOWN.md` → `[B1]` (gated by) or `[↳B1]` (downstream of).
- **Ledger:** every shipped UI PR adds a line to `.planning/LEDGER.md`.

---

## 5. Scope guardrail (read before adding)

- UI tasks must stay inside **approved scope** (Sprint Plan v2 / Aaron's F1–F13 rate card). A redesign or new surface is a **scope change** → route through `sops/01-invoice-approval-routes.md`, don't just add it as a UI task.
- Launch-visible surfaces only at P0: `LAND`, `CHK`, `AUTH`, `WELC`, `DASH`, `ACCT`, `LIB`, `FIND`. Everything else is gated — UI work on gated routes is P2.

---

## 6. Copy-paste template

```markdown
### [UI-AREA-NN] <verb> <what> — <surface>

- **Surface:**
- **Type:**
- **Priority:**
- **Description:**
- **Acceptance:**
- **Design ref:**
- **Status:** ⬜
- **Depends on / DENIS-VERIFY:**
```
