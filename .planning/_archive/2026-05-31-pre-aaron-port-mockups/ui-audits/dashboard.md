# UI Audit — Dashboard `/dashboard`

**File:** `src/routes/dashboard/+page.svelte`
**Audited by:** claude-launch-day · 2026-05-31
**Status when audited:** PENDING

## Strategic finding

This is the most consequential page for launch. Every signed-in visit lands here. The current implementation is **structured for a populated state** — course cards, next event, lead update, resource lanes. **At launch, all of those are empty or near-empty.** Rendering empty rails in the existing structure makes the product look broken.

The fix is empty-state-as-feature: the dashboard becomes a confident, transparent briefing screen explaining where the cohort is, what's queued, and what the member can do today.

## On-brand mechanics
- [x] Brand tokens throughout
- [x] Reuses `CourseCard`, `MemberIdentityPanel`, `GamificationWidget`
- [ ] `GamificationWidget` may render zeros for everyone at launch — needs an explicit "Training points unlock when modules go live" state

## Copy / structure
- [ ] Section headings assume content exists ("Resume training", "Up next")
- [ ] No cohort-status hero — biggest miss
- [ ] No "set up your profile" nudge for incomplete profiles
- [ ] Free-tier upgrade banner reads like a sales surface in the member shell

## Proposed direction (mockup)
1. **Cohort status hero** at top: "Cohort 1 · Week 1 of 8 · Module 1 releases Dec 15"
2. **Profile completion CTA** — only shows if profile incomplete; full-width panel; goes away once done
3. **What's live for you today** strip: account · partner finder · community
4. **What's coming** strip with target dates: Module 1 (date), first live session (date), leaderboard
5. **Updates feed** when there are updates, hidden when empty
6. **Drop** the resource-lane grid for launch — bring back when there's content

## Open questions
1. Real cohort dates?
2. Profile completion = checking `member_profiles.background` not null + `location` filled?
3. Should the free-tier upgrade banner exist on /dashboard at all? Free users probably shouldn't land here.
