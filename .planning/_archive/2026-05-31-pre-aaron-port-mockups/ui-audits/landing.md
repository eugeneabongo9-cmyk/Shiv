# UI Audit — Landing `/`

**File:** `src/routes/+page.svelte`
**Audited by:** claude-launch-day
**Date:** 2026-05-31
**Status when audited:** PENDING

---

## Context shift (the strategic finding)

Existing landing copy reads like a **product marketing page** — explaining what the network IS to someone deciding whether to buy. That fit pre-launch when the page also had to convert the curious. **Post-launch, every visitor has already purchased.** The page should:

- Confirm they're in
- Explain what's available *today* (sign in, set profile, opt in)
- Be transparent about what's queued and when
- Carry the founding-member momentum (the count works, keep it)

The current page is well-built and on-brand, but it talks past the actual audience.

---

## Brand fidelity

- [x] All colors from token table — confirmed, no hex literals
- [x] All fonts from token table — Space Grotesk throughout
- [x] Border-radius standard
- [x] Reuses `.eyebrow`, `.hero-pill`, `.btn-primary`, `.btn-secondary`, `.panel`
- [x] Container width within 1200px

## Copy voice

- [ ] **Reads like marketing, not member.** "A sharper home for the ShivWorks Network" is a product-page headline. A member-facing landing should be confirming, not selling.
- [ ] **No empty-state honesty.** Nothing acknowledges that the curriculum isn't live yet. New members will sign in, see an empty library, and assume the product is broken.
- [ ] "Inside the network" 4-track ops board describes generic platform features. Should be replaced with **what's queued this cohort** with actual target dates.

## Interactive states

- [x] Buttons have hover via base CSS
- [x] Links transition color on hover
- [ ] **Verify:** does `/dashboard` from a signed-in user actually load? (it 302s for unauth, need to verify auth'd flow)
- [x] `SHIVWORKS_MAIN_SITE` and `SHIVWORKS_MEMBERSHIP_URL` links are real

## Empty / loading / error

- [x] Member-count fetch has a `try/catch` and falls back to SSR seed — good
- [ ] No skeleton/placeholder while the first count fetch is in-flight (acceptable since SSR seeds it)
- [ ] No error message variant — fine, network failures stay silent

## Layout

- [x] Hero grid responsive (existing CSS handles down to mobile)
- [ ] **Verify in browser** at 375px / 768px / 1440px — audit doc is mechanical; visual check required

## A11y

- [x] One `<h1>` per page
- [x] `h2`s for section headings, `h3`s in cards
- [x] Icons use `lucide-svelte` (semantic SVGs)
- [ ] **Verify:** does the founding-member count region announce updates to screen readers? Currently no `aria-live`.

## Tracking & integration

- [x] `/api/members` count endpoint exists and is wired
- [x] Auth-aware CTA (signed-in user sees "Go to dashboard", anon sees "Sign in" + "Create free account")
- [ ] **Question for owner:** "Create free account" — is that intentional? Most launch visitors have a paid tier already.

---

## Proposed changes (mockup direction)

Saved to `.planning/ui-mockups/landing.html` for visual sign-off.

### Hero (rewrite)
- **Eyebrow:** "Founding cohort · Network is live"
- **H1:** "You're in. The training network is open." (or owner-approved variant)
- **Lede:** Acknowledge their purchase, explain what's available today, set the curriculum timeline expectation
- **Primary CTA:** "Sign in" (anon) / "Open dashboard" (auth) — unchanged
- **Secondary CTA:** "Set up your profile" — links to /account

### New: Cohort timeline strip
Replace the 4-track "Inside the network" ops board with a horizontal timeline of the actual cohort schedule:
- Week 1: Filming (now)
- Week 2: First module live — "Origin Story"
- Week 3-4: Modules 2-3
- Week 5: First live session
- Week 6-8: Remaining modules drop weekly

Each cell has a status pill: `Filming` / `Editing` / `Live` / `Queued`.

### Keep: Founding-member counter
Already works. Keep as-is. Move it higher (right under the hero) so social proof hits before the timeline.

### Keep but trim: "Public brand outside. Member operations inside."
Useful for context, shorten to 2 sentences.

### Cut: "What changes here" 3-promise grid
Pre-launch marketing copy. Members already bought; they don't need the promise.

---

## Open questions for owner

1. Real target dates for cohort filming + first module drop?
2. Confirm "free account" path should remain or be removed?
3. Founding member capacity number — do we have one to put in the counter ("X of N")?
4. Should signed-in users hit `/dashboard` directly instead of seeing the landing page at all? (Hard redirect vs. soft welcome.)
