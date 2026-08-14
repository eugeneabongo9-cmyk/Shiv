# UI Audit — Find Partners `/find-partners`

**File:** `src/routes/find-partners/+page.svelte`
**Audited by:** claude-launch-day · 2026-05-31
**Status when audited:** PENDING

## Strategic finding

Functional Aaron-port code (listFinderCandidates with filters works). The launch failure mode: **at week 1, almost nobody has opted into being findable** because almost nobody has completed their profile. A member opens this and sees 2 results, assumes nothing's here, leaves.

Fix: lead with a profile-CTA banner ("Add your location to be found by other members") and a counter ("47 founding members · 8 currently visible as you grow your network"), so empty results feel like a momentum problem the member can help solve, not a dead product.

## On-brand mechanics
- [ ] **Bespoke styles** — most CSS appears to be page-local (`.page`, `.hdr`, `.lede`, `.banner`, `.filters`, `.row`, `.chk`) instead of brand tokens
- [ ] Probably doesn't use the standard `.eyebrow` / `.hero-pill` / `.panel` system
- [x] Reuses `SendMessageButton` (currently disabled placeholder, correct)

## Copy / structure
- [x] Banner already prompts unprofiled users to add location — keep
- [ ] Filter form is fine but feels admin-y — should feel more like a discovery tool
- [ ] No member-count framing
- [ ] No empty-state copy when filters return 0

## Proposed direction (mockup)
1. **Convert to brand shell** (eyebrow + h1 + panel system)
2. **Add a counter chip:** "47 founding members · 8 currently visible"
3. **Banner upgrade:** when viewer has no location, banner uses `panel` not `.banner`, with strong CTA
4. **Filter row** repackaged inside a `.panel`, chip-style multi-select for backgrounds
5. **Empty result state** with copy: "No partners match these filters yet. Your founding cohort is still completing profiles — check back this week."
6. **Card grid** for results using existing `CourseCard`-style chrome

## Open questions
1. Are background filter checkboxes the right pattern, or chips?
2. Should we surface "X new members joined this week" to add momentum?
3. Privacy: anything to add about "your location is approximate" reassurance?
