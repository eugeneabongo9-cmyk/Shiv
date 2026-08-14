# UI Audit — Community `/community`

**File:** `src/routes/community/+page.svelte`
**Audited by:** claude-launch-day · 2026-05-31
**Status when audited:** PENDING

## Strategic finding

Current implementation tries to do two things: (1) explain why the community lane exists, and (2) provide the Circle handoff. For launch, the page is **gated on Circle URL config** (`hasCircle`). When config is missing, copy says "Config pending" — fine for internal but reads as a bug to members.

Cleaner launch story: if Circle is wired, **embed the Circle iframe directly** with a thin shell above. If not, ship a confident empty state that points at the alternative (member updates feed, Library, direct support).

## On-brand mechanics
- [x] Brand tokens
- [x] Reuses `MemberIdentityPanel`
- [x] Lots of nested community-specific class names — fine

## Copy / structure
- [ ] "Phase 1 uses Circle as the discussion layer" — meta-commentary about implementation phase; members don't care
- [ ] "Community state: Config pending" — debug copy bleeds into the UI
- [ ] Three "community signal cards" with member-state info competes with the actual community embed
- [ ] No conversation-starter or guidance — empty Circle is intimidating

## Proposed direction (mockup)
1. **Single hero:** "Member discussion lane. Tied to the curriculum, not open-ended chatter."
2. **If Circle configured:** embed Circle iframe full-bleed below, no other content above except the hero
3. **If Circle missing:** show a "Discussion lane goes live Dec 15 with Module 1" empty state + link to /library and /find-partners
4. **Drop** the signal-card grid (member-state surfaces belong on dashboard, not here)

## Open questions
1. Will Circle URL be configured by launch? (Aaron's task w446)
2. Do we have a first conversation prompt to seed the community with? ("Introduce yourself: where are you training, what brought you here.")
