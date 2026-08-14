# UI Audit — Welcome `/welcome`

**File:** `src/routes/welcome/+page.svelte`
**Audited by:** claude-launch-day · 2026-05-31
**Status when audited:** PENDING

## Strategic finding

Current welcome page shows the member 3–4 "next step" cards (continue to redirect, library, live, community, vip-calls) using the existing data-driven `nextSteps` logic. **For launch this is too many doors.** A new member who just signed up should see one strong path: set up your training profile. Everything else competes with that.

## On-brand mechanics
- [x] Uses brand tokens — confirmed in script imports
- [x] Reuses `MemberIdentityPanel`, `MembershipBadge` — good
- [x] Icons from lucide-svelte

## Copy / structure
- [ ] Too many CTA cards for a first-time-after-signup screen
- [ ] Doesn't acknowledge the cohort-filming reality
- [ ] "Continue to Dashboard" is the right default but isn't visually dominant
- [ ] No "what's available today vs. what's coming" framing

## Proposed direction (mockup)
- **One primary CTA:** "Set up your training profile" (→ /account)
- **One secondary CTA:** "Skip for now — open dashboard"
- **Inline reassurance:** cohort week + first module ETA
- **Drop the 4-card grid** — replace with a 2-row status strip ("Profile setup · 2 min" + "First module · Dec 15")

## Open questions
1. Should "Set up training profile" be the FORCED next step (redirect), or a strong suggestion they can skip?
2. Do we have a real first-module date to put in the reassurance copy?
