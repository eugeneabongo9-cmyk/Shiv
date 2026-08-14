# Micah Sync Checklist (w463-b)

**Deadline:** 48 hours before launch (May 30, 2026, 18:00 local)  
**Purpose:** Single consolidated list of everything that needs Micah's review, approval, or merge action.  
**Usage:** Send as a single message/email with PR links attached.

---

## Message to send Micah

---

Hi Micah,

We hit the 48-hour window before June 1 launch. Below is what I need from you. Deadline: **May 30 at 6 PM**.

**1. Review and merge the production-readiness PRs** *(w435)*

These 8 PRs are the launch-critical batch. Each one has passed `pnpm check`, `pnpm lint`, `pnpm format`, and `pnpm test` in CI. They need your review and merge before we can deploy.

PRs to review:
*(list the GitHub PR URLs here once they are opened against the repo — each w### task from the production-readiness batch should have its own PR)*

If you want to batch-review rather than PR-by-PR, I can also put together a single summary doc of the diff scope for each one.

**2. People of ShivWorks — content direction confirmation** *(w430)*

The People directory is live and showing member profiles with Bronze/VIP badges. I need your call on one open question: should the directory show **all paid members by default**, or should members need to explicitly opt in to appear? The current code shows all paid members. A member profile privacy setting (Task #17) is planned as a follow-up — I just want to confirm the launch default.

Default to: **show all paid members** | **hide all until opted-in**

**3. Gamification widget design** *(w431)*

The gamification widget is live on the dashboard showing XP, badges, and leaderboard position. Do you want any design changes to the widget before launch, or is the current state shippable?

Answer: **Ship as-is** | **Change needed: ___**

**4. Checkout reconciliation — confirm with Aaron first** *(w433)*

Once Aaron confirms the WC vs. Stripe decision (see aaron-sync.md), I'll need your OK to remove the unused checkout path (or to adjust the UI copy if both stay). I'll follow up with a specific question once Aaron's answer lands.

---

## Tracking

| Item | Status | Completed |
|------|--------|-----------|
| 8 production-readiness PRs merged | ⬜ Pending | — |
| People directory default confirmed | ⬜ Pending | — |
| Gamification widget design signed off | ⬜ Pending | — |
| Checkout reconciliation (post-Aaron) | ⬜ Blocked on Aaron | — |

Update this table as items land. Add a LEDGER.md entry for each `DECISION` or `UNBLOCKED`.
