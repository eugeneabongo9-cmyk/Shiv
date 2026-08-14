# Load Test Plan — Artillery, 600+ concurrent users

**Why now.** We're owning the full launch. Beta opens to ~643 already-paid founding members plus marketing-driven new traffic. A realistic peak is 600+ concurrent users on the landing + tracker in the first hour, with dashboard load following as members log in. Without a load test, we discover saturation on launch day; with one, we discover it on a Tuesday.

**The artifact.** `tests/load/scenarios.yml` (full ramp) + `tests/load/smoke.yml` (quick check). Both run via Artillery. Pass/fail thresholds enforced via Artillery's `ensure` block.

## What "600+ concurrent" means here

Artillery measures load by **arrival rate** (new virtual users per second), not concurrent users. With our scenario mix averaging ~3s wall-clock duration (think-time included), an `arrivalRate: 200` sustained yields ≈ 600 in-flight virtual users at steady state. The full config ramps:

| Phase         | Duration | Arrival rate | ≈ Concurrent |
| ------------- | -------- | ------------ | ------------ |
| Warm up       | 60s      | 5/s          | ~15          |
| Ramp to 100/s | 90s      | 5→100/s      | ~300         |
| Ramp to 200/s | 60s      | 100→200/s    | ~600         |
| **Sustained** | **120s** | **200/s**    | **~600**     |
| Cool down     | 30s      | 200→5/s      | tapering     |

Total wall time ≈ 6 minutes.

## Scenarios (weights ≈ expected traffic)

| Scenario                       | Weight | What it exercises                                             |
| ------------------------------ | ------ | ------------------------------------------------------------- |
| Public landing (cold visitor)  | 35 %   | `GET /` + sitemap — the cacheable workhorse                   |
| Founding-member tracker poll   | 25 %   | `GET /api/members` — KV target once cache exists              |
| Browse library + see a course  | 15 %   | `GET /library` + `GET /library/[slug]` — course catalog reads |
| Open checkout page             | 12 %   | `GET /checkout` — Stripe-wired today, WC tomorrow             |
| Open dashboard (auth-required) | 8 %    | `GET /dashboard` — tier-gated; tests the auth path            |
| Live tab + Community tab       | 5 %    | `GET /live` + `GET /community` — the secondary tabs           |

The dashboard scenario expects `200`, `302`, or `303` because the redirect to login under no-session is correct behavior — we want to load-test the redirect path itself, not skip it.

## Pass/fail (the `ensure` thresholds)

| Metric      | Smoke     | Full      |
| ----------- | --------- | --------- |
| p95 latency | < 1000 ms | < 1500 ms |
| p99 latency | —         | < 3000 ms |
| Error rate  | < 2 %     | < 1 %     |

These are SLO-shaped: a p95 of 1.5s is a reasonable launch-day floor for content reads on Cloudflare Pages. p99 < 3s prevents one bad request poisoning the experience. Error rate budget is tight because at 600 concurrent users, 1 % errors = 6+ unhappy members per second.

## Why we expect the first run to fail (and that's the point)

Per `ARCHITECTURE.md` §5, the app today has zero edge cache. Every scenario read hits D1. At 200 new users per second, that's roughly 600 D1 reads/second from `/`, `/library`, `/api/members` alone — well past the comfort zone for a single Worker pool.

The load test is therefore the **forcing function** for the cache plan:

| Stage                   | Expected p95         | Action                                                    |
| ----------------------- | -------------------- | --------------------------------------------------------- |
| Baseline (no cache)     | 2–4 s                | Run the test; document baseline numbers in the LEDGER.    |
| After L2 (`setHeaders`) | 1.0–1.5 s            | Sitemap, landing, `/api/members` cached for 60s at edge.  |
| After L3 (Cache API)    | 0.6–1.0 s            | Library catalog cached at edge for 5min, tag-invalidated. |
| After L4 (KV)           | < 0.5 s on hot paths | Tier lookup + course catalog from KV, sub-ms reads.       |

We hold the line at `ensure: p95 < 1500ms` and let the cache work close the gap. Each cache layer lands as a separate PR; each PR runs the full Artillery test in CI (manual trigger) and the LEDGER entry records the before/after numbers.

## Targets

| Target                   | URL                             | When                                                              |
| ------------------------ | ------------------------------- | ----------------------------------------------------------------- |
| Local preview            | `http://localhost:4173`         | Default — every developer should be able to run `pnpm load:smoke` |
| Cloudflare Pages preview | a preview deployment URL        | After every cache PR — measure real edge performance              |
| Production               | `https://network.shivworks.com` | Pre-launch only, off-hours, on a maintenance-banner               |

**Never load-test prod during business hours.** The smoke is safe (60s, 10 vU/s). The full test will absorb workers; schedule it.

## CI

Today: manual run only (`pnpm load:full`). Reason: it's a 6-minute test and would burn CI minutes on every PR.

Once stable, add `.github/workflows/load.yml` with:

- `workflow_dispatch` for manual runs against a preview URL.
- `schedule` weekly against staging for regression watch.

## What this test does NOT cover

- **Authenticated/load-balanced sessions.** All scenarios are anonymous. Authenticated read paths (real `/dashboard` content) need a follow-up with seeded Clerk sessions.
- **Write paths.** Progress writes (`POST /api/library/episodes/[id]/progress`) are write-mostly and need their own load test against a non-production D1.
- **Webhook bursts.** The WC webhook receiving a surge of provisioning calls (e.g., a marketing push) is its own scenario — model with `artillery run` against the webhook endpoint specifically, with replay-protection bypass disabled.
- **Long-poll / SSE.** None in the app today; if added, Artillery handles via `engine: socketio` or `engine: ws`.

## Companion docs

- `ARCHITECTURE.md` — full stack + the 4-layer cache plan this test is sized for.
- `INFISICAL.md` — secrets needed if scenarios are extended to authenticated flows (Clerk session bootstrapping).
- `tests/load/README.md` — operator-facing how-to.
