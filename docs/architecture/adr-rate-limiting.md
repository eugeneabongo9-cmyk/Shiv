# ADR: Atomic rate limiting on Cloudflare

**Status:** Accepted  
**Date:** 2026-06-22  
**Context:** Member-facing endpoints (RSVP, VIP requests, auth provision-check, progress APIs) used a KV-backed fixed-window limiter with read-modify-write semantics. KV has no atomic increment.

## Problem

```text
Request A: GET count=4
Request B: GET count=4   (concurrent)
Request A: PUT count=5
Request B: PUT count=5   (lost increment)
→ Both allowed when limit is 5; up to O(concurrency) bypass possible
```

With limit=5 and 25 concurrent requests, KV-style logic can allow 15–25 requests (measured in `scripts/benchmark-rate-limit.mjs`).

## Options evaluated

| Option                              | Atomicity         | Latency               | Ops complexity                | Horizontal scale    | Verdict                                        |
| ----------------------------------- | ----------------- | --------------------- | ----------------------------- | ------------------- | ---------------------------------------------- |
| **KV read-modify-write**            | None              | ~5–15 ms              | Low                           | Excellent           | ❌ Current gap                                 |
| **D1 single-row UPSERT**            | Row lock (SQLite) | ~10–30 ms             | Low                           | Good (single D1 DB) | ✅ **Selected**                                |
| **D1 batch / explicit transaction** | Per-batch         | Similar               | Medium                        | Good                | Unnecessary — one UPSERT suffices              |
| **Durable Objects**                 | Strong per-key    | ~5–20 ms + cold start | High (new binding, router)    | Excellent at edge   | Overkill for current traffic                   |
| **Queues**                          | N/A (async)       | N/A                   | High                          | Good                | ❌ Wrong model — limits must be synchronous    |
| **Hybrid DO + D1**                  | Strong            | Higher                | Very high                     | Excellent           | ❌ Premature — adds ops without measurable win |
| **Workers Rate Limiting API**       | Native            | Lowest                | Medium (binding, plan limits) | Excellent           | Viable future upgrade; not in wrangler today   |

## Decision

**Replace KV rate limiting with D1 atomic fixed-window buckets** using a single `INSERT … ON CONFLICT DO UPDATE` statement per check.

### Why D1

1. **Already provisioned** — `DB` binding exists; no new infrastructure.
2. **True atomic increment** — SQLite serializes writes per row; `request_count` cannot be lost.
3. **Audit trail** — `rate_limit_denials` table + structured logs (`rate_limit_denied`).
4. **Fail-closed** — DB errors deny requests instead of fail-open bypass.
5. **Local dev parity** — `d1-compat` SQLite path runs the same SQL in tests.

### Why not Durable Objects (yet)

DOs provide the strongest per-key consistency at the edge. For ~6 protected endpoints and modest QPS, D1 row contention is negligible. Revisit DOs if:

- P99 rate-limit latency exceeds SLO due to D1 write pressure, or
- Global abuse patterns require per-PoP counters without central DB writes.

## Implementation

```
checkRateLimit()
  └─ consumeRateLimitBucket()   // atomic UPSERT + RETURNING
       └─ rate_limit_buckets    // one row per bucket_key
  └─ recordRateLimitDenial()   // on deny only
       └─ rate_limit_denials
```

**Policies:** `src/lib/constants/rate-limit-policies.ts`

| Endpoint         | Key                            | Limit | Window |
| ---------------- | ------------------------------ | ----- | ------ |
| RSVP             | `rl:rsvp:{userId}`             | 10    | 1 h    |
| VIP call request | `rl:vip-call:{userId}`         | 5     | 1 h    |
| Provision check  | `rl:provision-check:{ip}`      | 20    | 5 min  |
| Module progress  | `rl:module-progress:{userId}`  | 120   | 1 min  |
| Episode progress | `rl:episode-progress:{userId}` | 120   | 1 min  |
| Module notes     | `rl:module-notes:{userId}`     | 30    | 1 h    |

## Observability

| Signal                    | Source                                   |
| ------------------------- | ---------------------------------------- |
| `rate_limit_denied`       | Workers log (key, count, limit)          |
| `rate_limit_check_failed` | Workers log (fail-closed path)           |
| `rate_limit_denials`      | D1 audit table                           |
| Sentry `RATE_LIMITED`     | Existing error taxonomy on 429 responses |

**Prune:** `pruneExpiredRateLimitBuckets()` — run via scheduled Worker/cron weekly.

## Consequences

### Positive

- No concurrency bypass under fixed-window semantics.
- Centralized policy constants.
- Denial audit for abuse investigation.

### Negative

- +1 D1 write per rate-limited request (acceptable at current scale).
- KV binding no longer used for rate limits (KV remains for member cache).

### Migration

1. Apply `migrations/0038_rate_limit_buckets.sql`.
2. Deploy app code (endpoints pass `db` not `kv`).
3. Old KV `rl:*` keys expire via TTL — no backfill needed.

## Benchmarks

```bash
node scripts/benchmark-rate-limit.mjs 50 10
```

Expected: KV simulation allows >>10; D1 allows exactly 10 with `finalRequestCount: 50`.

## Success criteria mapping

| Criterion                    | How met                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| No race bypasses             | Atomic UPSERT                                              |
| Consistent under concurrency | Verified in `rate-limit.test.ts` (25 parallel → 5 allowed) |
| Production observability     | Logs + `rate_limit_denials`                                |
| Horizontal scalability       | Stateless Workers; D1 handles write serialization          |
| Cloudflare-native            | D1 + Workers (no external Redis)                           |
