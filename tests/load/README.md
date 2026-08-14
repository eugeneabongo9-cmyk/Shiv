# Load testing — Artillery

Targets **~600+ concurrent virtual users** on the launch-critical surfaces.

## Run it

```bash
# Quick check (~1 min, 10 vU/s, p95 < 1000ms required)
pnpm load:smoke

# Full ramp (~6 min, ramps to ~600 concurrent, p95 < 1500ms required)
pnpm load:full

# Against a remote target (default is http://localhost:4173)
LOAD_TARGET=https://network.shivworks.com pnpm load:full

# Generate the HTML report (after a run)
pnpm load:report
```

Local runs assume `pnpm preview` is up (built output served at :4173). If you want it auto-started, run `pnpm build && pnpm preview &` first.

## What it tests

Six scenarios, weighted to approximate launch-day traffic — landing + tracker are the dominant ~60% of load, library/checkout the next chunk, dashboard a smaller authenticated slice. Full mix in `scenarios.yml`.

## Pass/fail (the `ensure` block)

| Metric      | Smoke     | Full      |
| ----------- | --------- | --------- |
| p95 latency | < 1000 ms | < 1500 ms |
| p99 latency | —         | < 3000 ms |
| Error rate  | < 2 %     | < 1 %     |

Any breach fails the run.

## Calibration note

Artillery's `arrivalRate` = new virtual users per second. With an average scenario duration of ~3s (think-time-included), `arrivalRate: 200` sustained ≈ 600 concurrent in-flight users. That's the launch target. Adjust ramp slopes in `scenarios.yml` if real scenario durations differ materially.

## Without cache, expect this to be miserable

Per `.planning/architecture/ARCHITECTURE.md` §5, the app currently has no edge cache. Every load test scenario hits D1. The first run is expected to fail the p95 threshold — that's the **forcing function** for the L2–L4 cache work. Re-run after each cache layer lands to measure the lift.
