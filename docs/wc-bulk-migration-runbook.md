# WC → D1 bulk-migration runbook

Pre-launch one-shot: pull all existing WooCommerce founding-member buyers from `shivworkspg.com` into `member_imports` in production D1 so they can claim their tier when they sign up on the network.

**Owner:** Max (script driver) · **Required from Aaron:** read-only WC REST API key/secret pair.

This runbook is the canonical sequence. Each step is idempotent — safe to re-run on failure.

---

## 0 · One-time prep (Aaron, ~5 min)

WordPress admin on `shivworkspg.com`:

1. **WooCommerce → Settings → Advanced → REST API → Add key**
   - Description: `Network bulk-migration (read-only)`
   - User: an admin user (himself)
   - Permissions: **Read**
2. Click **Generate API key**. Paste the **consumer key** (`ck_...`) and **consumer secret** (`cs_...`) into Bitwarden / Infisical / a one-time secret share. Don't paste into chat.
3. Send the credentials to Max via Infisical "Share Secret" (one-time link).

> The key is read-only and can be revoked the moment migration completes. No write access to WC is ever needed.

---

## 1 · Extract from WooCommerce → CSV (Max, ~2 min)

From the network repo root, with the WC credentials Aaron just shared:

```powershell
$env:WC_BASE = "https://shivworkspg.com"
$env:WC_CONSUMER_KEY = "ck_…"
$env:WC_CONSUMER_SECRET = "cs_…"
pnpm tsx scripts/wc-extract.ts --out ./buyers.csv
```

What it does:

- Calls `GET /wp-json/wc/v3/orders?status=completed&per_page=100&page=N` paginated until empty
- Filters every order's `line_items` for product IDs `31517` (bronze) and `31518` (vip)
- Skips orders with no matching product ID, invalid emails, or duplicate emails
- Writes `buyers.csv` with columns: `email, first_name, last_name, name, tier, wc_order_id, ordered_at`

Output looks like:

```
Fetching status="completed" (per_page=100, max_pages=50)…
  page 1: +97 buyers (cumulative 97)
  page 2: +98 buyers (cumulative 195)
  …
  page 7: empty — done with this status

──────────────────────────────
Wrote 643 buyer rows to E:\…\buyers.csv
Skipped 12 orders (no tier / invalid email / duplicate).
```

**Sanity check** before going further:

```powershell
Get-Content buyers.csv | Measure-Object -Line  # should match the buyer total above + 1 header row
```

---

## 2 · Compile to SQL (Max, ~10 sec)

```powershell
pnpm tsx scripts/wc-build-sql.ts --in ./buyers.csv --out ./buyers.sql
```

Produces a `.sql` file containing batched `BEGIN; INSERT … ON CONFLICT DO UPDATE; COMMIT;` blocks. Mirrors the exact UPSERT shape used by the live WC webhook (`upsertImportedMemberProvision` in `src/lib/server/db/shivworks.ts`), so this run is functionally identical to ~600 webhooks firing — just without the round-trip latency.

**Spot-check the SQL** before applying:

```powershell
Get-Content buyers.sql -TotalCount 30  # see the header + first batch
```

---

## 3 · Dry-run against local D1 first (~30 sec)

```powershell
wrangler d1 execute shivworks-network-db --local --file=./buyers.sql
```

Verify locally that it parses + applies:

```powershell
pnpm tsx scripts/wc-reconcile.ts --csv ./buyers.csv
# expects: 0 missing, 0 extra, all rows present
```

If reconciliation shows **missing > 0**, the SQL has a syntax issue or a row has unescaped characters — fix `wc-build-sql.ts` and re-run from step 2.

---

## 4 · Apply to remote production D1 (~30 sec to 2 min depending on size)

```powershell
wrangler d1 execute shivworks-network-db --remote --file=./buyers.sql
```

Reconcile against remote:

```powershell
pnpm tsx scripts/wc-reconcile.ts --csv ./buyers.csv --remote
```

Expected output:

```
── 1. Totals
   CSV rows:    643
   D1 rows:     643
   Δ:           0

── 2. Missing in D1 (CSV email not found): 0
── 3. Extra in D1 (D1 row not in CSV): 0
── 4. Claim status (members who completed Clerk signup)
   Claimed:    0  (0%)
   Unclaimed:  643  (waiting for the buyer to sign up)
── 5. Tier breakdown
   CSV:  bronze=580  vip=63
   D1:   bronze=580  vip=63

──────────────────────────────
✓ Reconciliation OK — every CSV row exists in D1.
```

---

## 5 · Verification — end-to-end claim flow (~5 min)

Pick a real buyer email from `buyers.csv` (use Aaron's own, or a test buyer). They open the network, click Sign Up, complete Clerk with the same email. On first authenticated request:

- `claimImportedMemberProvision(email)` runs in the auth hook
- `member_imports.claimed_at` updates with current timestamp
- `member_imports.claimed_member_id` populates with the new Clerk user id
- A `members` row is created with `tier = bronze | vip` and `access_status = active`
- Welcome email fires via Resend

Confirm with:

```powershell
wrangler d1 execute shivworks-network-db --remote --command="SELECT email, tier, claimed_at FROM member_imports WHERE email = 'aaron@example.com'"
wrangler d1 execute shivworks-network-db --remote --command="SELECT email, tier, access_status FROM members WHERE email = 'aaron@example.com'"
```

---

## 6 · Post-migration · stale flag check (anytime after launch)

Run weekly or before any re-engagement campaign to find buyers who paid but never signed up:

```powershell
wrangler d1 execute shivworks-network-db --remote --file=scripts/wc-stale-flag.sql
```

Returns the up-to-200 oldest unclaimed imports with their `days_old`. Feed the email list to Resend or ActiveCampaign for a "we noticed you never signed up" nudge.

---

## Rollback

If step 4 produces wrong data and we need to wipe just the WC-sourced rows (rare — the UPSERTs are idempotent so re-running with a corrected CSV is usually the right move):

```sql
DELETE FROM member_imports
WHERE source_ref LIKE 'wc:%' AND claimed_at IS NULL;
```

> Never delete rows where `claimed_at IS NOT NULL` — that's a real member who has already signed up. Those need a separate, deliberate cleanup.

---

## Failure modes & what they mean

| Symptom                                    | Likely cause                              | Fix                                                                                          |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `wc-extract.ts` returns 401                | bad consumer key/secret                   | Aaron regenerates the WC REST API key, re-share                                              |
| `wc-extract.ts` returns 200 but 0 buyers   | product IDs don't match `31517` / `31518` | Update `PRODUCT_TIER` in `wc-extract.ts` and `wc-webhook.ts` to match real product IDs in WC |
| `wc-build-sql.ts` complains "invalid tier" | a row has unrecognized tier text          | Inspect that row in `buyers.csv`, fix or remove, re-run from step 2                          |
| `wrangler d1 execute` errors on apply      | SQL syntax (single quote in a name?)      | Fix `sqlEscape` in `wc-build-sql.ts` or manually fix the offending row                       |
| Reconcile shows missing rows               | UPSERTs partially applied                 | Re-run step 4 — UPSERTs are idempotent, no harm                                              |
| Reconcile shows extra rows                 | Webhook fired after extract, or test data | Check timestamps — if it's a real new buyer, ignore; if test data, manually clean            |

---

## Files

- `scripts/wc-extract.ts` — WC REST API → CSV
- `scripts/wc-build-sql.ts` — CSV → batched UPSERT SQL
- `scripts/wc-reconcile.ts` — CSV vs D1 reconciliation
- `scripts/wc-stale-flag.sql` — orphan unclaimed import query
- `scripts/bulk-import.ts` — legacy CSV → D1 path (uses binding, only works inside Worker runtime; superseded by the SQL-file path)

All scripts are TypeScript and require `pnpm tsx` to run.
