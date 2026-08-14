# Aaron Sync Checklist (w463-a)

**Deadline:** 24 hours before launch (May 31, 2026, 18:00 local)  
**Purpose:** Single consolidated list of everything blocked on Aaron's input or access.  
**Usage:** Send as a single message/email; each item unblocks a specific feature or launch gate.

---

## Message to send Aaron

---

Hi Aaron,

We're on the final push before the June 1 launch. Below is everything I need from you, in priority order. Each item has a hard deadline of **May 31 at 6 PM** — if any of these slip we'll either launch without that feature or delay the wave.

**1. WC / Fortis payment path confirmation** *(unblocks checkout reconciliation)*

The Network app currently has both a Stripe checkout path and a WooCommerce/Fortis path. I need you to confirm which one is the primary route for the launch. If WC/Fortis is the only path, I can remove the Stripe checkout UI. If both stay, I need to know when Stripe should be shown.

Decision needed: **WC/Fortis only** | **Stripe only** | **Both (explain when)**

**2. Sentry project + DSN** *(unblocks production error monitoring)*

Please create a Sentry project for `network.shivworks.com` (type: SvelteKit) and send me:
- Server-side DSN (goes in `SENTRY_DSN`)
- Client-side DSN (goes in `VITE_SENTRY_DSN`)

These go into Infisical `prod` env. Without them, production errors will be silent.

**3. Clerk test users** *(unblocks end-to-end auth tests)*

I need four test user accounts created in the Clerk **development** instance:
- Bronze member (tier: `bronze`)
- VIP member (tier: `vip`)
- Admin user (role: `admin`)
- Revoked member (tier: `free`, previously bronze — subscription cancelled)

Please create them in Clerk → Users and send me the email addresses + temporary passwords.

**4. Circle community URL** *(unblocks `/community` page)*

Please send me the Circle community embed URL for `PUBLIC_CIRCLE_COMMUNITY_URL`. The community page currently shows a blank embed without it.

Also, if you have brand font files (woff2) and the final social link URLs (Instagram, etc.) for the landing page, please send those too.

**5. DNS — SPF / DKIM / DMARC records** *(unblocks email deliverability)*

I've generated the DNS records needed for Resend to send from `noreply@network.shivworks.com`. I need you (or whoever manages DNS for `shivworks.com`) to publish three records. I'll send you the exact record values once Resend generates them. This takes 5 minutes to add but propagation takes up to 1 hour, so we need to do this on May 31.

**6. Branch protection on main** *(unblocks merge workflow)*

Please enable branch protection on the `main` branch in GitHub:
- Require pull request before merging
- Require status checks to pass (select: `check`, `lint`, `format`, `unit`, `build`)
- Require branches to be up to date before merging

Path: GitHub repo → Settings → Branches → Add rule → Branch name: `main`.

---

That's the full list. Let me know if anything is unclear or needs more context. These 6 items are the only hard blockers between us and a clean June 1 launch.

---

## Tracking

| Item | Status | Received |
|------|--------|----------|
| WC/Fortis payment path | ⬜ Pending | — |
| Sentry DSN | ⬜ Pending | — |
| Clerk test users | ⬜ Pending | — |
| Circle URL + brand assets | ⬜ Pending | — |
| DNS SPF/DKIM/DMARC | ⬜ Pending | — |
| Branch protection on main | ⬜ Pending | — |

Update this table as items land. Add a LEDGER.md entry for each `UNBLOCKED`.
