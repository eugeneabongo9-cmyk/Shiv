# UI Audit — Library `/library`

**File:** `src/routes/library/+page.svelte`
**Audited by:** claude-launch-day · 2026-05-31
**Status when audited:** PENDING

## Strategic finding

Existing copy is already pointed in the right direction: *"The complete ShivWorks roadmap, visible from day one."* That IS the launch story. The page needs to render that roadmap clearly even when zero courses are available. Right now the all/available/roadmap filter implies content; at launch all courses live in "roadmap" with target dates.

## On-brand mechanics
- [x] Brand tokens
- [x] Reuses `CourseCard`, `sortCoursesForDisplay`
- [ ] Filter chips (all/available/roadmap) read as broken if "available" is empty

## Copy / structure
- [x] Eyebrow + h1 + lede already do the framing work
- [ ] Free-tier upgrade banner stays useful here — keep
- [ ] Resume panel will never render at launch — needs an empty-state companion or hide cleanly
- [ ] Each `CourseCard` needs to support a "Coming <date>" pill prominently when status is `coming_soon`

## Proposed direction (mockup)
1. **Hero unchanged** — already on-brand
2. **Filter row** — default to "Roadmap" at launch (since available count = 0), hide the "Available" filter when count = 0
3. **CourseCard variant for coming-soon** — module title, target date pill ("Module 02 · Dec 15"), week tag, locked icon, "Get notified" link
4. **Cohort timeline strip** above the grid (similar to landing) showing week 1–8 high-level
5. **VIP-only series** keep as-is

## Open questions
1. Final list of all courses + their target dates?
2. Should locked modules be clickable (→ details page with "We'll email you when it drops") or non-interactive?
