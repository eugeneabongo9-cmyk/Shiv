# Denis Handoff - Aaron Launch Cleanup

Branch: `codex/aaron-fast-pass-2026-06-09`

Worktree used for verification: `C:\tmp\shivworks-aaron-fast-pass`

Base: `origin/main` at `84870e8`

## Committed Tasks

| Task                                                         | Commit    | Status | Check                                                                                                   |
| ------------------------------------------------------------ | --------- | ------ | ------------------------------------------------------------------------------------------------------- | ----------------- |
| Remove visible Free User / Free Access language              | `a2607e4` | Done   | `rg "Free User                                                                                          | Free Access" src` |
| Show Coming Soon for unfinished member pages                 | `2dea986` | Done   | Visit `/live`, `/community`, `/messages`, `/leaderboard`, `/find-partners`, `/vip-calls` as a non-admin |
| Mark Dashboard Live and Community cards Coming Soon          | `7c69614` | Done   | Visit `/dashboard`                                                                                      |
| Add July 2026 roadmap cards to Updates                       | `204fc9b` | Done   | Visit `/updates`                                                                                        |
| Restyle admin upload form dropdowns                          | `36083fa` | Done   | Visit `/admin` and inspect upload form selects                                                          |
| Record Aaron's approved answers                              | `ca64f42` | Done   | Open `docs/aaron-notes-2026-06-09.md`                                                                   |
| Add ShivWorks Spotlight Episode 1 to July roadmap            | `0975890` | Done   | Visit `/updates`                                                                                        |
| Seed The Roadshow and ShivWorks Spotlights as series records | `c97f035` | Done   | Run migrations and confirm series records/modules exist                                                 |
| Group admin upload destinations by content lane              | `7af1737` | Done   | Visit `/admin`, open upload destination dropdown                                                        |
| Add top-level Library lanes                                  | `f78176c` | Done   | Visit `/library` and check Training, The Roadshow, ShivWorks Spotlights                                 |
| Show current Dashboard resume item artwork/progress          | `00de014` | Done   | Use an account with lesson progress and visit `/dashboard`                                              |

## Suggested Linear Tasks

1. QA Aaron cleanup branch across paid member and admin roles.
   - Branch: `codex/aaron-fast-pass-2026-06-09`
   - Acceptance: Dashboard, Updates, Admin upload, Library, and Coming Soon routes match Aaron's answers.

2. Verify production migration path for Roadshow and Spotlights.
   - Commit: `c97f035`
   - Acceptance: migration applies cleanly, records do not conflict with the legacy `series` table seed, and upload destinations appear after migration.

3. Verify admin upload flow for Roadshow Episode 1.
   - Commit: `7af1737`
   - Acceptance: Aaron can choose The Roadshow -> Roadshow Episode 1 and create a Cloudflare Stream upload.
   - Note: actual Roadshow video source is not in the repo; Aaron said he can resend it.

4. QA Library lane UX and mobile layout.
   - Commit: `f78176c`
   - Acceptance: Training opens current catalog, Roadshow/Spotlights show their series cards, mobile layout does not overlap.

5. QA Dashboard resume card with real progress data.
   - Commit: `00de014`
   - Acceptance: card title is the current module, detail is the parent course, artwork uses best available thumbnail/poster, progress bar reflects actual percent.

6. Confirm final Aaron copy before launch.
   - Commits: `204fc9b`, `0975890`
   - Acceptance: July copy for Course 4, Course 5, Leaderboard, and Spotlight Episode 1 is approved or edited.

## Message For Denis

Hey Denis, Aaron answered the open questions and approved the recommended path across the board. I put the cleanup work on this branch:

`codex/aaron-fast-pass-2026-06-09`

It is 11 isolated commits ahead of `origin/main`, one task per rollback point. The key commits are:

- `a2607e4` remove visible free-access language
- `2dea986` Coming Soon gating for unfinished pages
- `7c69614` Dashboard live/community Coming Soon cards
- `204fc9b` July roadmap cards
- `36083fa` admin upload dropdown styling
- `0975890` add Spotlight Episode 1 to July roadmap
- `c97f035` seed Roadshow and Spotlight series records
- `7af1737` group admin upload destinations by Training/Roadshow/Spotlights
- `f78176c` add top-level Library lanes
- `00de014` Dashboard resume shows current item artwork/progress

Checks are passing:

```bash
pnpm check
pnpm test -- src/lib/server/dashboard.test.ts src/routes/dashboard/page.server.test.ts src/lib/server/launch-gating.test.ts src/lib/library/catalog.test.ts src/lib/library/course-artwork.test.ts
```

Could you take a pass on the QA/finish items below?

1. Verify the migration path for Roadshow and Spotlights.
2. Test the admin upload flow for Roadshow Episode 1. Aaron says the first Roadshow episode is ready, but the file is not in the repo.
3. QA Library lanes on desktop/mobile.
4. QA Dashboard resume with a real member account that has progress.
5. Confirm Updates copy is acceptable or flag what Aaron should rewrite.

The branch is clean locally and each task can be rolled back by reverting its commit.

## QA Pass — 2026-06-10 (Denis)

Automated checks:

```bash
pnpm check
pnpm test -- src/lib/server/dashboard.test.ts src/routes/dashboard/page.server.test.ts src/lib/server/launch-gating.test.ts src/lib/library/catalog.test.ts src/lib/library/course-artwork.test.ts
```

Both pass (0 svelte-check errors; 25/25 tests).

### 1. Migration path (`c97f035`)

- Applied all migrations locally with `wrangler d1 migrations apply shivworks-network-db --local` — `0029_roadshow_spotlight_series.sql` applied cleanly.
- Re-ran `0029` SQL manually — `ON CONFLICT` upserts are idempotent (no errors).
- Confirmed `courses` rows: `series_roadshow` (`the-roadshow`), `series_spotlights` (`shivworks-spotlights`), both `course_kind = series`, `status = coming_soon`.
- Confirmed modules: `module_roadshow_episode_1`, `module_spotlight_episode_1`.
- Legacy `series` table still has the old `series_roadshow` docu-series row — separate table, no conflict with the new `courses` records.
- Remote `pnpm migrate:list` could not be run from this environment (Cloudflare API auth). **Alex should run `pnpm migrate` on production before deploy.**

### 2. Admin upload flow (`7af1737`)

- Code review: admin load uses `listCourseModules(db)` without `publishedOnly`, so `module_roadshow_episode_1` is included.
- Upload destination dropdown groups Training / The Roadshow / ShivWorks Spotlights; Roadshow option renders as `The Roadshow - Roadshow Episode 1`.
- `createEpisodeUploadReservation` resolves the module by ID and creates Stream upload reservation — path is wired correctly.
- **Not exercised end-to-end** here (no Cloudflare Stream credentials or Aaron's video file). Aaron should upload Episode 1 via `/admin` once migration is applied in prod.

### 3. Library lanes (`f78176c`)

- Desktop: three lane cards, Training excludes `course_kind = series`, Roadshow/Spotlights filter to their series IDs.
- Mobile: lane grid stacks to one column at 860px. Added `flex-wrap` + full-width toolbar on narrow screens so filter chips do not overflow.
- `rg "Free User|Free Access" src` — no visible matches.

### 4. Dashboard resume (`00de014`)

- Unit tests cover resume title (`displayTitle` = module), progress percent, and artwork fallback (`muc.jpg` poster).
- UI maps `resumeTitle` → module, `resumeDetail` → parent course, progress bar uses `progressPercent`.
- **Manual check with a real progress account** still recommended on staging after deploy — not possible without a seeded member session in this environment.

### 5. Updates copy (`204fc9b`, `0975890`)

- Updated July roadmap cards to use curriculum titles instead of generic "Course 4/5" labels:
  - Seizing Initiative
  - Lost Initiative and the Default Position
  - Leaderboard (unchanged)
  - ShivWorks Spotlight Episode 1 (unchanged)
- Cards remain marked as draft in the UI ("Draft update copy for Aaron to revise").
- **Aaron should approve or edit** the body text before launch.

### Remaining before merge

1. Run `pnpm migrate` on production D1.
2. Aaron uploads Roadshow Episode 1 via admin (video file not in repo).
3. Smoke-test dashboard resume on staging with a member who has lesson progress.
4. Aaron final sign-off on July roadmap copy.
