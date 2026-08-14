# Aaron's repo — reconcile intake

**Generated:** 2026-05-30
**Source:** https://github.com/aaron-outerfields/shivworks-demo @ `main` (last push 2026-05-31)
**Target:** `createsomethingtoday/shivworks-network` @ `main` (this repo)
**Status:** intake complete; reconcile **not** executed. Read before merging anything.

---

## TL;DR

Aaron's repo is a **feature-broader fork** of the same SvelteKit + CF Workers + D1 stack. He added five new product surfaces (community, DMs, leaderboard, profile, find-partners, onboarding) and six new migrations. Our repo has the **hardening layer** he lacks (error taxonomy, cache scaffolding, rate-limit, structured logging, KV stub, Sentry wiring).

Merging is a **2–3 day reconcile**, not a one-shot. The collision points are migration numbering (0008–0012) and ~170 file-level diffs in `src/`. Tonight's launch should ship **our repo as-is**; reconcile happens after.

---

## Stack — identical

Both repos: SvelteKit 2 + Svelte 5 + Vite 6 + `@sveltejs/adapter-cloudflare` + D1 + Wrangler + pnpm. Same `tsconfig.json` strictness. No framework changes required to merge.

## Migrations — collision map

| #                        | Ours                               | Aaron's                                                                                                    | Action on merge                         |
| ------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 0001–0007                | identical                          | identical                                                                                                  | keep as-is                              |
| **0008**                 | `media_assets_and_module_episodes` | **`community`**                                                                                            | renumber Aaron's → `0013`               |
| **0009**                 | `processed_webhook_events`         | **`gamification`**                                                                                         | renumber Aaron's → `0014`               |
| **0010**                 | `indexes`                          | **`member_profiles_tags`**                                                                                 | renumber Aaron's → `0015`               |
| **0011**                 | `gamification`                     | **`direct_messages`**                                                                                      | renumber Aaron's → `0016`               |
| **0012**                 | `member_profiles`                  | **`recognitions`**                                                                                         | renumber Aaron's → `0017`               |
| —                        | —                                  | `0013–0017` (onboarding, recognition_day_bucket, dm_conversation_reports, in_app_notifications, system_kv) | renumber → `0018–0022`                  |
| 0008 (ours) ≡ 0018 (his) | `media_assets_and_module_episodes` | **byte-identical** to ours                                                                                 | **drop his 0018** — ours already exists |

**Critical gotcha:** Aaron's `0009_gamification` and our `0011_gamification` likely target the same `member_gamification` table. Schema must be compared row-by-row before merging — if they differ in column definitions, we have to pick one and migrate-forward the other.

## src/ — divergence summary

**Total diff:** 175 files differ or are unique to one side.

### Only in OURS (hardening / observability layer)

- `src/hooks.client.ts` — Sentry client init
- `src/lib/errors/` — taxonomy + classifier + tests (INV-005)
- `src/lib/server/cache.ts` + `cache.test.ts` — cache scaffolding
- `src/lib/server/kv-cache.ts` — KV stub
- `src/lib/server/log.ts` — structured logError + Sentry (INV-004)
- `src/lib/server/rate-limit.ts` — rate limiting
- `src/lib/server/activecampaign.ts` — AC integration
- `src/lib/components/GamificationWidget.svelte`

### Only in AARON's (feature surface)

**Routes (top-level):** `account`, `find-partners`, `leaderboard`, `messages`, `profile`

**Components:** `CustomVideoPlayer.svelte`, `EpisodePlayer.svelte`, `DmListener.svelte`, `MockAuthPanel.svelte`, `OnboardingChecklist.svelte`, `ProfileChips.svelte`, `SendMessageButton.svelte`, `Sidebar.svelte`, `TrainingStatus.svelte`, `community/`, `profile/`

**Server libs:** `admin-analytics.ts`, `auth-mode.ts`, `community-access.ts`, `community-presenter.ts`, `community-tp.ts`, `db-availability-guard.ts`, `gamification.ts`, `in-app-notifications.ts`, `onboarding.ts`, `realtime.ts`, `runtime-key-guard.ts`

**Constants:** `course-thumbnails.ts`, `pricing.ts`

**Email templates:** `media-upload-failed.ts`

**Tests:** `hooks.server.test.ts`, `admin-analytics.test.ts`, `check-auth-mode.test.ts`, `db-availability-guard.test.ts`, `gamification.test.ts`, `onboarding.test.ts`, `realtime.test.ts`, `runtime-key-guard.test.ts`

### Modified in BOTH (need manual three-way merge)

- `src/app.css`, `src/app.d.ts`, `src/app.html`
- `src/hooks.server.ts` ← our Sentry+classify vs his auth-mode+realtime
- `src/lib/server/clerk.ts`, `guards.ts`, `admin.ts`, `member-imports.ts`, `env.ts`, `d1-compat.ts`, `db/shivworks.ts`
- Most email templates (`welcome`, `vip-booking`, `session-security`, `update-notification`, `livestream-reminder`, `import-onboarding`, `content-release`, `client-progress-update`)
- `lib/constants/site.ts`, `tiers.ts`, `tiers.test.ts`, `notifications.ts`
- Most shared components: `ClerkMount`, `CourseCard`, `Footer`, `MemberIdentityPanel`, `MembershipBadge`, `Nav`, `SignOutButton`

## Aaron's recent work focus (last 8 commits, all 2026-05-26)

- Admin video upload status sync from CF Stream
- Resumable Cloudflare Stream uploads (network-drop tolerant)
- Admin video sync UI

This overlaps significantly with our `media_assets` table + Stream webhook work but appears more polished. **A candidate to cherry-pick post-launch.**

## Recommended path (post-launch)

**Phase R1 — Migration renumber** (~2 hrs)

1. Branch off our `main`: `feat/aaron-reconcile`
2. Copy Aaron's `0008`–`0017` into a `pending/` folder
3. Renumber per the table above (his `0008` → `0013`, … his `0017` → `0022`; drop his `0018`)
4. Diff his `0009_gamification` vs our `0011_gamification` — pick canonical version, generate forward-migration if schemas differ
5. Run on staging D1 first, confirm idempotent

**Phase R2 — Server libs** (~4 hrs) 6. Copy in his net-new `src/lib/server/*` files (community, DMs, onboarding, recognitions, realtime, etc.) 7. Manually merge `hooks.server.ts` — keep our Sentry+classify path, layer in his auth-mode + realtime hooks 8. Reconcile `clerk.ts`, `guards.ts`, `admin.ts`, `member-imports.ts` — keep our cache/log/rate-limit imports, layer in his community/DM/onboarding hooks 9. Run unit tests; fix mismatches

**Phase R3 — Routes + components** (~6 hrs) 10. Copy in net-new route trees (`/account`, `/find-partners`, `/leaderboard`, `/messages`, `/profile`) 11. Copy in net-new components (video players, DM listener, sidebar, onboarding checklist, etc.) 12. Reconcile shared components (Nav, Footer, etc.) — these likely need design alignment, not just a merge 13. `pnpm check`, `pnpm test`, `pnpm smoke` all green

**Phase R4 — Verification** (~2 hrs) 14. Manual smoke on all overlapping routes (dashboard, library, settings, etc.) 15. Verify gamification still works (was changed in both repos) 16. Verify member-imports + WC webhook still claim correctly

**Total estimate:** 14 hours of focused engineering. Realistic two-day reconcile pass.

## Pre-reconcile prep that can happen anytime

- Get **write access to Aaron's repo** or have him push to a branch on ours → enables proper merge tooling
- Compare gamification schemas (his `0009` vs our `0011`) — write the diff into this file
- Standardize on a single video player approach (his `CustomVideoPlayer` + `EpisodePlayer` vs our existing `media_assets` UI)

---

## What ships tonight without this reconcile

Our repo, as-is. Aaron's feature additions (community, DMs, leaderboard, profile, find-partners, onboarding, in-app notifications) **are not part of the launch surface tonight**. The launch surface tonight is: dashboard, library, live, updates, vip-calls, community (Circle link-out only), settings, admin, checkout, login, signup, welcome. All of those exist and verify green in our repo today (Phase 0 results: check 0 errors, test 77 pass, lint 0 errors, build clean).

If Aaron's community/DM/leaderboard work is expected to be **visible at launch**, we must delay launch by 2–3 days. If it's expected to ship in a follow-up, we're clear to deploy tonight.
