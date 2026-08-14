# Aaron's Frontend Site Map

**Generated:** 2026-05-31 (intake of `aaron-outerfields/shivworks-demo` @ `main`)
**Purpose:** map every front-end surface Aaron built, what state it's in, what it depends on, and what we need to decide about each one for launch.

---

## Reading the table

| Column              | Meaning                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| **Status**          | What's _built in his repo_ — not what's in ours                          |
| 🟢 Complete         | Page renders, server load is wired, forms work, real data flows          |
| 🟡 Partial          | Renders but missing major piece (e.g., no write action, hard-coded data) |
| ⚪ Stub             | Placeholder only                                                         |
| **Tier gate**       | What auth/membership level the page requires                             |
| **DB deps**         | D1 tables it reads/writes — _bold_ = doesn't exist in our schema yet     |
| **Server lib deps** | `$lib/server/*` files we'd need to port                                  |

---

## Section 1 — Surfaces Aaron has that we don't

### `/account` — Member training profile 🟢 Complete

**Lines:** 221 server / 294 svelte
**Tier gate:** Authenticated (any paid tier)
**Purpose:** Member fills out their training profile after first login. Civilian/LE/military/medical background, location (city + state), training goal, prior courses, carry setup, ECQC/MUC alumni flags.

**Features:**

- Profile completion form with validation (city required, state 2-letter, goal required, ≥1 background)
- Leaderboard opt-in toggle
- "Show me in partner finder" toggle (defaults true)
- Awards Training Points (TP) the first time the profile is marked complete
- "Skip for now" action → cookie-stamped, redirects to `/dashboard`
- Welcome banner via `?welcome=1` URL param (for the first-login flow)

**DB deps:** **`member_profiles`** (or his `member_profiles_tags`), **`member_gamification`**
**Server lib deps:** `db/shivworks.ts` (getMemberProfile, upsertMemberProfile, getLeaderboardOptIn, setLeaderboardOptIn), `gamification.ts` (awardPoints), `guards.ts` (requireAuthenticated)

**Changes needed to ship:** Bring in member_profiles migration + the four profile helpers + a minimal awardPoints stub. Could ship without points awarding by stripping the `awardPoints` call (5-minute change).

---

### `/community` — In-app community channels 🟢 Complete

**Lines:** 51 server / 493 svelte (his largest single page)
**Tier gate:** Paid member
**Purpose:** Replaces the Circle link-out. Per-tier-gated channels with message feeds, pinning, channel groups.

**Features:**

- Channel list grouped by category (welcome, general, tier-specific, etc.)
- Per-tier permissions: read / post top-level / reply
- Initial channel from URL param `?channel=slug`, defaults to `welcome`
- Pinned-first sort, message focus via `?message=id`
- Sub-route: `/community/feed` (separate page server + svelte, not inspected yet)
- 403 if no channels visible for member's tier

**DB deps:** **`community_channels`**, **`community_messages`**, **`community_channel_permissions`**, **`community_pins`** (all from his `0008_community.sql`)
**Server lib deps:** `db/shivworks.ts` (listChannels, listChannelMessages), `community-access.ts` (permissionsFor), `community-presenter.ts` (reorderChannelsForBrief, sortPinnedFirst, presentMessages), `guards.ts` (requirePaidMember)

**Changes needed to ship:** Full community migration (his 0008, renumbered) + 3 server libs + channel seeding script. **Two-day integration**, not launch-night.

---

### `/messages` — Direct messages 🟢 Complete

**Lines:** 36 server / 240 svelte + nested `[partnerId]` route
**Tier gate:** Paid member
**Purpose:** 1-to-1 messaging between members. Conversation list view + per-partner thread view.

**Features:**

- Conversation list with partner name, tier, last message preview, unread count
- Sub-route `/messages/[partnerId]` for individual threads (has its own test file)
- DM listener component (`DmListener.svelte`) suggests realtime/polling for new messages

**DB deps:** **`dm_conversations`**, **`dm_messages`**, **`dm_conversation_reports`** (moderation)
**Server lib deps:** `db/shivworks.ts` (listDmConversations, listMembersByClerkUserIds), `realtime.ts`, `guards.ts`

**Changes needed to ship:** His `direct_messages` + `dm_conversation_reports` migrations + realtime layer. **High complexity** for moderation + realtime. Strong candidate for placeholder at launch.

---

### `/leaderboard` — Gamification leaderboard 🟢 Complete

**Lines:** 32 server / 163 svelte
**Tier gate:** Paid member
**Purpose:** Top 25 members by Training Points, monthly + all-time scopes.

**Features:**

- Scope toggle: monthly / all_time
- Top 25 + viewer's own entry shown separately
- Privacy: names rendered as "First L." (so members can opt in without full-name exposure)
- Respects `leaderboardOptIn` flag — opted-out members don't appear

**DB deps:** **`member_gamification`** (his `0009_gamification.sql`)
**Server lib deps:** `gamification.ts` (getLeaderboard), `db/shivworks.ts` (getLeaderboardOptIn), `guards.ts`

**Changes needed to ship:** Gamification migration + gamification lib. User has said gamification is **post-launch**, so this is a placeholder.

---

### `/find-partners` — Member partner finder 🟢 Complete

**Lines:** 71 server / 261 svelte
**Tier gate:** Paid member
**Purpose:** Filterable directory of members who opted in via `/account`. Find training partners by location/background/goal.

**Features:**

- Filters: state (defaults to viewer's), city, training goal, background (multi), ECQC alumni only
- Returns name, tier, location, background, training goal
- Respects `showInFinder` opt-in flag

**DB deps:** **`member_profiles`** (the `showInFinder` flag + filterable columns)
**Server lib deps:** `db/shivworks.ts` (getMemberProfile, listFinderCandidates), `guards.ts`

**Changes needed to ship:** Needs member_profiles migration (same as /account) + listFinderCandidates query. **If we ship `/account`, this is cheap to add** — same data, different read pattern.

---

### `/profile` (self) + `/profile/[userId]` (public) 🟢 Complete

**Lines:** 39 server / 117 svelte for `/profile`; nested route for `[userId]`
**Tier gate:** Paid member
**Purpose:** Self-profile view + public profile view of other members.

**Features:**

- Member info (name, tier, role, member-since)
- Training profile (from /account)
- Gamification dossier (TP, rank, badges)
- Training stats (modules complete, episodes watched, etc.)

**DB deps:** **`member_profiles`**, **`member_gamification`**, existing `members` + `member_episode_progress`
**Server lib deps:** `db/shivworks.ts` (getMemberByClerkId, getMemberProfile, getMemberTrainingStats), `gamification.ts` (getMemberDossier), `guards.ts`

**Changes needed to ship:** Same deps as /account + /leaderboard combined. If we have those, /profile is essentially free.

---

## Section 2 — Surfaces both repos share (need three-way merge if integrated)

These exist in both repos. Aaron's may have polished UI, ours has hardening (Sentry, error boundaries, cache scaffolding).

| Route               | Ours                                   | Aaron's                                        | Note                                             |
| ------------------- | -------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `/` (landing)       | Basic                                  | Differs                                        | Visual diff needs review                         |
| `/dashboard`        | Basic                                  | Likely richer                                  | His pulls in onboarding checklist + recognitions |
| `/library`          | Functional                             | Likely has his CustomVideoPlayer/EpisodePlayer | His video UX may be better                       |
| `/live`             | Functional                             | Differs                                        | Inspection needed                                |
| `/updates`          | Functional                             | Differs                                        | Inspection needed                                |
| `/vip-calls`        | Functional                             | Differs                                        | Inspection needed                                |
| `/settings`         | Functional                             | Differs                                        | His likely includes link to /account             |
| `/admin`            | Functional                             | Has admin-analytics surface                    | His richer                                       |
| `/checkout`         | **🟢 wired to WC (ours, just merged)** | Differs                                        | Keep ours — recently fixed                       |
| `/login`, `/signup` | Clerk-mounted                          | Same pattern                                   | Likely cosmetic diffs only                       |
| `/welcome`          | Functional                             | Differs                                        | Likely his is more polished                      |

---

## Section 3 — Polished UI layer Aaron has

Independent of routes — pure design-system gains:

| File                               | Why it matters                                    |
| ---------------------------------- | ------------------------------------------------- |
| `src/app.css`                      | His global design tokens (colors, fonts, spacing) |
| `src/app.html`                     | Likely sets fonts/meta we don't have              |
| `Sidebar.svelte`                   | We don't have one — uses top nav only             |
| `Nav.svelte` (his version)         | Newer/polished                                    |
| `Footer.svelte` (his version)      | Newer/polished                                    |
| `MemberIdentityPanel.svelte` (his) | Newer/polished                                    |
| `CustomVideoPlayer.svelte`         | His own player for Stream videos                  |
| `EpisodePlayer.svelte`             | Episode-aware player for library content          |
| `OnboardingChecklist.svelte`       | First-login walk-through panel                    |
| `ProfileChips.svelte`              | Inline profile-summary pills                      |
| `TrainingStatus.svelte`            | Member training progress widget                   |
| `community/` (folder)              | Community-specific components                     |
| `profile/` (folder)                | Profile-specific components                       |

---

## Section 4 — Launch recommendation matrix

| Surface                               | Effort                                                                   | Risk                                                                                   | Launch-night fit?                              |
| ------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `/account`                            | **2-3 hrs** — member_profiles migration + 4 helpers + strip gamification | Low                                                                                    | **YES — ship it**                              |
| `/profile` (self only, no public)     | +1 hr on top of /account                                                 | Low                                                                                    | **YES — ship it without gamification dossier** |
| `/find-partners`                      | +1 hr on top of /account                                                 | Low-medium (needs index for filtering)                                                 | **MAYBE — depends on time**                    |
| `/leaderboard`                        | Half-day (needs gamification, which is post-launch per user)             | Medium                                                                                 | **NO — placeholder**                           |
| `/messages`                           | 2 days (needs DM tables + realtime)                                      | High                                                                                   | **NO — placeholder**                           |
| `/community` (in-app)                 | 2 days (needs channels infra + permissions + seeding)                    | High                                                                                   | **NO — placeholder, keep Circle link-out**     |
| **Aaron's polished UI/UX layer**      | 3-4 hrs (cherry-pick CSS, Nav, Sidebar, Footer)                          | Low                                                                                    | **YES — ship it**                              |
| **CustomVideoPlayer / EpisodePlayer** | 1 hr                                                                     | Low                                                                                    | **YES — ship it**                              |
| **OnboardingChecklist**               | 1 hr                                                                     | Low (UI only, doesn't need his onboarding migration if we wire to /account completion) | **YES — ship it**                              |

---

## Section 5 — Recommended cherry-pick set for launch

**Tier 1 — definite (4-5 hours):**

- Aaron's `app.css` + `app.html`
- Aaron's `Nav.svelte`, `Sidebar.svelte`, `Footer.svelte`, `MemberIdentityPanel.svelte`
- `CustomVideoPlayer.svelte` + `EpisodePlayer.svelte`
- `ProfileChips.svelte`, `TrainingStatus.svelte`
- `/account` route + `member_profiles` migration + 4 db/shivworks helpers (strip awardPoints call)
- `/profile` route (self view, no public, no dossier)

**Tier 2 — if time allows (2-3 more hours):**

- `/find-partners` route + `listFinderCandidates` query
- `OnboardingChecklist.svelte` wired to "is profile complete" state

**Tier 3 — placeholders only:**

- `/community` → keep Circle link-out, add "in-app community coming soon" banner
- `/messages` → "Direct messages — coming soon" page
- `/leaderboard` → "Leaderboard — coming soon" page

**What this gets you:** a launch where every nav item exists, the platform feels complete, members can actually fill out their profile and find training partners, and the parts that aren't ready are clearly labeled as "coming soon" — not broken links.

---

## Open questions for Max

1. **Sub-routes I didn't read yet** — `/community/feed`, `/messages/[partnerId]`, `/profile/[userId]`. Want me to read those too, or are we treating them as part of the "needs full integration" bucket?
2. **OnboardingChecklist data shape** — does it need his `onboarding_checklist` migration or can we wire it to "profile complete?" boolean? (Need to read the component file to know.)
3. **Visual design conflict** — if his `app.css` clashes with what we have, do we adopt his wholesale or do a manual merge?
