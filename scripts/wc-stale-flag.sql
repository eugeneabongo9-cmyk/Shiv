-- scripts/wc-stale-flag.sql
-- Surface stale member_imports rows — buyers who paid via WC but never signed
-- up on the network within N days. Useful for re-engagement email targeting
-- and orphan cleanup.
--
-- Run via:
--   wrangler d1 execute shivworks-network-db --remote --file=scripts/wc-stale-flag.sql
--
-- This is read-only — it does NOT mutate state. Returns rows for inspection.

-- ─── 1. Aged unclaimed imports (older than 14 days, still no Clerk signup) ───
SELECT
  email,
  name,
  tier,
  source_ref,
  datetime(created_at / 1000, 'unixepoch') AS created_iso,
  CAST((strftime('%s', 'now') * 1000 - created_at) / 86400000 AS INTEGER) AS days_old
FROM member_imports
WHERE claimed_at IS NULL
  AND created_at < (strftime('%s', 'now') * 1000) - (14 * 86400000)
ORDER BY created_at ASC
LIMIT 200;
