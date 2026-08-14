<!-- Required structure per .planning/sops/00-pull-requests.md §4 -->

## What

<!-- One sentence. -->

## Why

<!-- Link the spec / issue / ledger entry it satisfies. -->

## How

<!-- Bullet the approach. -->

## Risk

- **Blast radius:**
- **Rollback plan:**

## Testing

- [ ] Unit tests added / updated
- [ ] Smoke locally
- [ ] Manual happy path
- [ ] Manual error path
- [ ] No secret strings in diff (`git diff main..HEAD | grep -iE 'sk_|whsec_|pk_live'`)
- [ ] No customer PII in diff (`pnpm verify:no-pii` passes; no `.db`/`.csv` exports/`founding-members.sql`/`d1-paste-chunks/`)

## Ledger

<!-- Per SOP §7a, every PR with an executable artifact appends an entry
     to .planning/LEDGER.md. Confirm with one of:                  -->

- [ ] Ledger entry appended (link to LEDGER.md anchor or paste entry preview)
- [ ] `ledger: waived — docs only`
- [ ] `ledger: waived — planning only`

## PR-Invoice

<!-- Macks Studios engagements ship a PR-Invoice with every billable PR.
     Drop the rendered HTML or PDF below, or link to the file path.
     Use `ledger: waived — non-billable` if this is internal-only work. -->

- [ ] Invoice rendered: `.planning/invoices/INV-XXX-<branch>.html`
- [ ] Not billable

---

<sub>Reviewer checklist lives in `.planning/sops/00-pull-requests.md` §5.</sub>
