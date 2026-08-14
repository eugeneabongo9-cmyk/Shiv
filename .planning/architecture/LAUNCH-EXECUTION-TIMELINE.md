# ShivWorks Network — Combined Launch Execution Timeline

**Built 2026-05-29 · 3 days to launch · pulled live from `system41.db`**

Single canonical list of every active task from pre-launch through Day 3, bucketed and ordered. Each row maps `w###` (board ID) → title → owner → `lane`/`craft` (rooted taxonomy) → hours from `INV-LAUNCH-001` → how-step count. To work a task, claim it on the board: `python project_cli.py task claim <slug>`. To see its how-steps: `python project_cli.py task board shivworks` and read the entry.

---

## Summary

| Bucket                                             | Tasks        | Est hrs   |
| -------------------------------------------------- | ------------ | --------- |
| ✅ Already shipped (production-readiness baseline) | 10           | ~23       |
| 🟢 Pre-launch — quote scope                        | 24           | 62.5      |
| 🟡 Aaron unblockers (15 min each)                  | 9            | ~1        |
| 🟠 Legacy / nice-to-have (not in launch quote)     | 21           | —         |
| 🚀 Day 1 — June 1 launch                           | 2            | 8.0       |
| 🔵 Day 2 — June 2 stabilization                    | (w460 spans) | continued |
| 🎯 Day 3 — June 3 retro + handoff                  | 1            | 2.0       |

**Pre-launch Max-hours per the quote: 62.5 hrs · Day 1 + Day 3 launch hrs: 10.0 hrs · Total quote: 82.5 hrs / $8,250 flat.**

---

## ✅ Already shipped (production-readiness baseline)

These landed on `main` already; they are the foundation, not part of the remaining quote.

| w###   | Title                                                          | Hows |
| ------ | -------------------------------------------------------------- | ---- |
| `w262` | Excalidraw CLI wireframe tool                                  | 2    |
| `w358` | Build Bronze + VIP webhook receivers on Replit/CF Pages        | 5    |
| `w418` | Lint + format baseline                                         | 3    |
| `w419` | Pre-commit hooks                                               | 2    |
| `w420` | Governance (CODEOWNERS, Dependabot, CONTRIBUTING)              | 3    |
| `w421` | Sentry SDK integration                                         | 2    |
| `w422` | Error boundaries (7 +error.svelte + checkout copy)             | 3    |
| `w423` | CI pipeline (check/lint/format/unit/build/smoke + PR template) | 2    |
| `w424` | Public smoke tests (6 Playwright specs, CI-wired)              | 3    |
| `w449` | L2 cache - SvelteKit setHeaders pass                           | 5    |

---

## 🟢 Pre-launch — quote scope

Grouped by INV-LAUNCH-001 section. Sequence within each section is up to you, but the section order is approximately critical-path: payment pipeline first (§1), then cache (§2), then security & verification (§3), then app features (§4), then store-side (§5), then infra (§6), with coordination + doc maintenance (§7) running alongside.

### §1 — Payment pipeline — the money path · 10.0 hrs

| w###   | Title                                  | Owner | Lane × Craft        | Hrs | Hows              |
| ------ | -------------------------------------- | ----- | ------------------- | --- | ----------------- |
| `w257` | Founding-member tracker urgency revamp | max   | `store` `design`    | 4.0 | 4                 |
| `w259` | Bulk-import dress-rehearsal harness    | max   | `fork` `automation` | 6.0 | 6 🚧 buyer-export |

### §2 — Cache architecture — 4-layer plan · 4.0 hrs

| w###   | Title                                  | Owner | Lane × Craft         | Hrs | Hows |
| ------ | -------------------------------------- | ----- | -------------------- | --- | ---- |
| `w450` | L4 cache - Cloudflare KV for hot reads | max   | `fork` `automation`  | 3.0 | 6    |
| `w451` | D1 index audit + add missing           | max   | `fork` `engineering` | 1.0 | 6    |

### §3 — Security & verification · 9.5 hrs

| w###   | Title                                                               | Owner | Lane × Craft         | Hrs | Hows              |
| ------ | ------------------------------------------------------------------- | ----- | -------------------- | --- | ----------------- |
| `w427` | Security hardening (webhook idempotency, zod, rate limits, headers) | max   | `fork` `engineering` | 6.0 | 5                 |
| `w428` | Auth-gated smoke tests (INV-003b)                                   | max   | `fork` `engineering` | 3.0 | 3 🚧 clerk-users  |
| `w429` | Sentry sourcemaps CI upload (after token)                           | max   | `fork` `automation`  | 0.5 | 2 🚧 sentry-token |

### §4 — Network app features (absorbed from Micah) · 21.0 hrs

| w###   | Title                                                            | Owner | Lane × Craft        | Hrs | Hows |
| ------ | ---------------------------------------------------------------- | ----- | ------------------- | --- | ---- |
| `w430` | 'People of ShivWorks' section (Micah)                            | max   | `app` `design`      | 7.0 | 3    |
| `w431` | Gamification visible surfaces — dashboard rank/TP/streak (Micah) | max   | `app` `design`      | 6.0 | 3    |
| `w432` | Dashboard tier-completeness audit (Micah)                        | max   | `app` `design`      | 3.0 | 2    |
| `w433` | Checkout UI vs WC decision — reconcile /checkout route (Micah)   | max   | `app` `design`      | 2.0 | 2    |
| `w434` | Live tab + Updates feed + Community (Circle) URL wiring (Micah)  | max   | `app` `engineering` | 3.0 | 3    |

### §5 — Store-side integration (WordPress / WC / Fortis / AC) · 5.0 hrs

| w###   | Title                                                                        | Owner    | Lane × Craft         | Hrs | Hows |
| ------ | ---------------------------------------------------------------------------- | -------- | -------------------- | --- | ---- |
| `w436` | WordPress /api/members count endpoint (Alex)                                 | max      | `store` `automation` | 2.0 | 3    |
| `w437` | WooCommerce webhook config — point to network.shivworks.com (Alex)           | max+alex | `store` `automation` | 0.5 | 3    |
| `w439` | Deploy checkout PHP templates + ActiveCampaign Bronze/VIP automations (Alex) | max      | `store` `automation` | 1.5 | 2    |
| `w462` | ActiveCampaign Bronze/VIP tag automations                                    | max      | `store` `automation` | 1.0 | 4    |

### §6 — Infrastructure, secrets, environments · 8.0 hrs

| w###   | Title                                      | Owner     | Lane × Craft        | Hrs | Hows |
| ------ | ------------------------------------------ | --------- | ------------------- | --- | ---- |
| `w452` | Infisical workspace + secret population    | max       | `coord` `ops`       | 1.5 | 5    |
| `w453` | Replit development environment             | max       | `coord` `ops`       | 1.5 | 5    |
| `w454` | Staging environment + smoke discipline     | max       | `fork` `automation` | 1.5 | 5    |
| `w455` | Production secrets rotation                | max       | `coord` `ops`       | 1.5 | 5    |
| `w456` | Resend deliverability - SPF / DKIM / DMARC | max+aaron | `coord` `ops`       | 0.5 | 5    |
| `w457` | Rollout + rollback runbook                 | max       | `coord` `ops`       | 1.5 | 5    |

### §7 — Coordination + doc maintenance · 5.0 hrs

| w###   | Title                                   | Owner     | Lane × Craft    | Hrs | Hows |
| ------ | --------------------------------------- | --------- | --------------- | --- | ---- |
| `w458` | Doc maintenance + LEDGER through launch | max       | `coord` `ops`   | 2.0 | 5    |
| `w463` | Aaron + Micah syncs through to launch   | max+aaron | `coord` `comms` | 3.0 | 4    |

---

## 🟡 Aaron unblockers — ~1 hr of Aaron's time

None of these are Max-hours, but every one of them frees Max-hours downstream.

| w###   | Title                                                             | Owner       | Lane × Craft          | Hrs | Hows |
| ------ | ----------------------------------------------------------------- | ----------- | --------------------- | --- | ---- |
| `w258` | Landing-page tier-card + banner copy drop                         | aaron       | `content` `comms`     | —   | 6    |
| `w341` | Aaron sync: lock voicing + receive fonts                          | aaron       | `coord` `comms`       | —   | 5    |
| `w356` | Aaron brand-system completion request (questions + Replit prompt) | aaron       | `coord` `comms`       | —   | 3    |
| `w442` | Starter Updates posts + People-of profiles (Aaron)                | aaron       | `content` `comms`     | —   | 2    |
| `w443` | Aaron: Confirm payment path — WC/Fortis, Stripe dormant           | aaron       | `coord` `ops`         | —   | 2    |
| `w444` | Aaron: Create Sentry project → provide DSN                        | aaron       | `coord` `ops`         | —   | 2    |
| `w445` | Aaron: Create Clerk Dev environment test users                    | aaron       | `coord` `ops`         | —   | 2    |
| `w446` | Aaron: Provide Circle URL + font files + social links             | aaron       | `coord` `comms`       | —   | 3    |
| `w447` | Aaron + Micah: Enable branch protection on main                   | aaron+micah | `coord` `engineering` | —   | 2    |

---

## 🟠 Legacy / nice-to-have — not committed in the launch quote

Carried on the board from earlier planning passes. Most are coordination or post-launch revenue items. Triage at the day-after retro (w461).

| w###   | Title                                                                               | Owner   | Lane × Craft           | Status      | Hows |
| ------ | ----------------------------------------------------------------------------------- | ------- | ---------------------- | ----------- | ---- |
| `w256` | Checkout tier-toggle handoff bundle                                                 | max     | `store` `design`       | in-progress | 6    |
| `w260` | Dashboard hi-fi wireframe + clickable prototype                                     | max     | `app` `design`         | idea        | 3    |
| `w265` | Daily Debrief to Slack project channel pipeline                                     | max     | `coord` `automation`   | idea        | 2    |
| `w266` | Handoff doc template + reusable bundle workflow                                     | max     | `coord` `ops`          | planned     | 3    |
| `w267` | Quantified-impact pitch deck for post-beta redesign                                 | max     | `coord` `comms`        | planned     | 6    |
| `w268` | Delegation pipeline pilot ($100 contractor)                                         | max     | `coord` `ops`          | idea        | 2    |
| `w269` | Phase-00 coordination push (Slack, tracker field, URLs)                             | max     | `coord` `ops`          | in-progress | 3    |
| `w270` | Tracker sync diagnostic + test-order automation                                     | max     | `store` `automation`   | planned     | 3    |
| `w340` | Alex relay message draft for Aaron                                                  | max     | `coord` `comms`        | planned     | 5    |
| `w350` | Schedule and hold Alex (ShivWorks dev) meeting                                      | max     | `coord` `ops`          | planned     | 2    |
| `w351` | Async Q&A with [TBD fulfillment contact] (ShivWorks) — shipment status mechanism    | max     | `coord` `ops`          | planned     | 3    |
| `w354` | Incoming dev onboarding session — Clerk audit + video host pickup + integration map | max     | `coord` `ops`          | planned     | 3    |
| `w355` | Checkout page rebuild on Replit — Outerfields style on ShivWorks WC pipeline        | max     | `store` `design`       | idea        | 2    |
| `w357` | Fix dark text fields on Replit checkout pages                                       | max     | `store` `design`       | idea        | 2    |
| `w425` | Doppler→Infisical doc fix                                                           | max     | `fork` `ops`           | planned     | 3    |
| `w426` | Open 8 contribution PRs upstream (fork → Micah's repo)                              | max     | `fork` `ops`           | planned     | 3    |
| `w435` | Merge Max's 8 production-readiness PRs (Micah)                                      | micah   | `fork` `ops`           | planned     | 3    |
| `w438` | Buyer export for bulk import — ~643 existing buyers (Alex)                          | alex    | `store` `ops`          | planned     | 2    |
| `w440` | Film + edit 3 courses — Origin Story + 2 others (Marvin)                            | marvin  | `content` `curriculum` | planned     | 3    |
| `w441` | Roadshow pilot episode + trailer encoded to Cloudflare Stream (Marvin)              | marvin  | `content` `curriculum` | planned     | 2    |
| `w448` | Physical fulfillment readiness — trainers, VIP blades (Shannon)                     | shannon | `coord` `ops`          | planned     | 2    |

---

## 🚀 Day 1 — June 1 launch

Morning: final E2E verification on production with a $0 test order. Once green, begin staged rollout per `w457` rollout-runbook cadence: batch 1 (50 users) → wait 30 min → batch 2 (150 users) → wait 30 min → remainder. On-call begins and runs through Day 2.

| w###   | Title                             | Owner | Lane × Craft         | Hrs | Hows |
| ------ | --------------------------------- | ----- | -------------------- | --- | ---- |
| `w459` | Final E2E verification            | max   | `fork` `engineering` | 2.0 | 7    |
| `w460` | Launch day on-call + Sentry watch | max   | `coord` `ops`        | 6.0 | 6    |

---

## 🔵 Day 2 — June 2 stabilization

Continued on-call (w460 spans Day 1 + Day 2 as one ~24 hr block). Monitor Sentry + CF Pages analytics; hot-fix readiness; capture any incidents in the LEDGER for the retro.

_No new tasks open on Day 2 — the work is keeping w460 running and triaging anything Sentry surfaces._

---

## 🎯 Day 3 — June 3 retro + handoff

Post-launch retrospective with Aaron + Micah. LEDGER finalization. v1.1 gap list. Reconcile actual hours vs estimate on `INV-LAUNCH-001`; generate the final invoice.

| w###   | Title                                   | Owner | Lane × Craft  | Hrs | Hows |
| ------ | --------------------------------------- | ----- | ------------- | --- | ---- |
| `w461` | Post-launch retrospective + handoff doc | max   | `coord` `ops` | 2.0 | 5    |

---

## How to use this list

- The `w###` board in `system41.db` is canonical. This timeline is a generated read-only view of it.
- Rebuild this file any time: `python build_timeline.py <db> <output.md>`.
- Each task's How-steps live as `how_items` in the DB. Reading them: `python project_cli.py task board shivworks` (or query the DB directly).
- Companion docs: `LAUNCH-PLAN-ALIGNMENT.md` (gap-list mapping), `LOAD-TEST-PLAN.md` (Artillery cache progression), `INFISICAL.md` (secrets), `ARCHITECTURE.md` (stack + cache plan), `INV-LAUNCH-001-full-launch-quote.html` (the flat-rate quote).
