# ShivWorks Network — Launch Rollout & Rollback Runbook

**Target date:** June 1, 2026  
**Owned by:** Aaron (ops lead), Alex (WC store)  
**Production URL:** `https://network.shivworks.com`  
**CF Pages project:** `shivworks-network`  
**D1 database:** `shivworks-network-db` (`62f1de1e-df8b-4cb1-b382-1e463d3375e1`)

---

## 0. Pre-launch prerequisites (T-24 h)

All items must be ✅ before the staged rollout begins.

- [ ] All production secrets populated in Infisical `prod` env and synced to CF Pages (see `docs/prod-ops-runbook.md`)
- [ ] Infisical → CF Pages integration live (no manually pasted vars)
- [ ] D1 migrations applied (`pnpm migrate`)
- [ ] WC webhooks configured and delivery log shows `200` (see `docs/wc-integration-runbook.md`)
- [ ] Resend domain `network.shivworks.com` verified; test email delivered (see `docs/prod-ops-runbook.md`)
- [ ] Clerk production keys active; JWT key matches CF Pages env
- [ ] AC automations live (`Jujitsu_Course_Member`, `VIP_Founding`)
- [ ] Staging smoke (`TARGET_URL=<staging-url> pnpm load:base`) passes with < 2% error rate
- [ ] D1 backup taken (step 1 below)

---

## 1. Pre-launch D1 snapshot

Take a named backup before any traffic lands so you can restore to a clean slate if needed.

```bash
wrangler d1 backup create shivworks-network-db --remote
```

Note the returned backup ID and timestamp in the launch ledger (e.g. `backup-id: abc123, 2026-06-01T10:00:00Z`).

To list available backups later:

```bash
wrangler d1 backup list shivworks-network-db --remote
```

---

## 2. Staged rollout cadence

The June 1 launch email goes out in four waves. Gate each wave on the thresholds in section 3 before advancing.

| Wave | Size | Hold before next wave |
|------|------|-----------------------|
| Wave 1 | 50 founding members (top of invite list) | 30 min |
| Wave 2 | 150 additional (200 total) | 30 min |
| Wave 3 | Remaining founding members | 30 min |
| Wave 4 | Public announcement / open link | — |

**How to send a wave:** Use the Resend broadcast (or the AC automation linked to the invite list). Do not share the Network URL publicly until Wave 4 is confirmed healthy.

---

## 3. Metric thresholds — advance vs. halt

Check Cloudflare Pages → Analytics and Cloudflare D1 → Metrics after each hold period.

### Advance (all of these must be true)

| Metric | Threshold |
|--------|-----------|
| 5-minute error rate (4xx/5xx) | ≤ 2% of requests |
| p95 response time | ≤ 3 s |
| D1 read/write errors in CF dashboard | 0 |
| Clerk auth failure rate | < 1% |

### Halt + triage (any one of these triggers a halt)

| Trigger | Action |
|---------|--------|
| Error rate > 2% | Pause wave, read Cloudflare Logs for 5xx origin, patch or rollback |
| p95 > 3 s sustained 5+ min | Pause wave, check D1 read latency and KV miss rate |
| D1 errors appear in CF dashboard | Halt all waves, investigate, restore from backup if data is corrupt |
| Clerk returning 401 at high rate | Check Clerk prod key in CF Pages env, redeploy if stale |
| Resend delivery failures > 5% | Pause email waves, check DNS + Resend domain status |

---

## 4. Cloudflare Pages one-click rollback

If the current deployment is broken and you need to instantly revert:

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → `shivworks-network`.
2. Click **Deployments**.
3. Find the last known-good deployment (the row just before the current one, or any row marked "Previously live").
4. Click **...** → **Rollback to this deployment**.
5. CF Pages immediately serves the previous build — no redeployment needed.
6. Confirm the error rate drops within 1–2 minutes.

**Via Wrangler (CLI alternative):**

```bash
# List recent deployments
wrangler pages deployment list --project-name=shivworks-network

# Rollback to a specific deployment ID
wrangler pages deployment rollback <deployment-id> --project-name=shivworks-network
```

---

## 5. D1 restore procedure from backup

Use only if the database contains corrupt data that cannot be patched with a migration.

> ⚠️ Restoring overwrites all data in the target database. Take a second backup of the current (broken) state first for forensics.

```bash
# Step 1: Backup the current broken state (for forensics)
wrangler d1 backup create shivworks-network-db --remote

# Step 2: List backups to find the restore point
wrangler d1 backup list shivworks-network-db --remote

# Step 3: Restore from the pre-launch backup (or most recent clean backup)
wrangler d1 backup restore shivworks-network-db <backup-id> --remote
```

After restoring:

1. Re-run any migrations that post-date the backup: `pnpm migrate`.
2. Validate the DB is sane: `pnpm db:shell "SELECT COUNT(*) FROM members"`.
3. Re-run the rollout from Wave 1 once the root cause is resolved.

---

## 6. Post-rollout validation (after Wave 4)

Run the Artillery base load test against production to confirm it holds under realistic traffic:

```bash
TARGET_URL=https://network.shivworks.com pnpm load:base
```

Pass criteria: error rate < 2%, p95 < 3 s across all scenarios. Archive the Artillery report:

```bash
pnpm load:report   # opens artillery/report.json as HTML
```

Record the pass/fail result in the launch ledger.

---

## 7. Contact escalation

| Issue | First contact | Escalation |
|-------|--------------|------------|
| CF Pages / D1 outage | Cloudflare Status (cloudflarestatus.com) | Cloudflare support ticket |
| Clerk auth down | Clerk Status (clerkstatus.com) | Clerk support |
| Resend deliverability | Resend dashboard → Logs | Resend support ticket |
| Stripe payment failure | Stripe Dashboard → Events | Stripe support |
| ActiveCampaign tag failure | CF Logs for `activecampaign.tag.*` events | Aaron |

---

_See also: `docs/wc-integration-runbook.md` (WC webhook ops), `docs/prod-ops-runbook.md` (secrets rotation + Resend DNS)._
