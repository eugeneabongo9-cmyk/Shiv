---
name: GitHub Actions runner provisioning failure
description: CI install job fails with runner_id=0 on every branch — account-level billing/quota issue, not a code issue.
---

## Rule
Every GitHub Actions run on `createsomethingtoday/shivworks-network` fails at the
`install (cached)` job with `runner_id: 0`, 3-second completion, zero steps, and no
stored logs. This means the runner is never provisioned.

**Why:** This is a GitHub Actions account-level issue — billing, quota, or free-tier
minutes exhausted. It affects ALL branches and PRs equally (confirmed across main,
feat/*, docs/* branches in the same period). It is NOT caused by anything in the code.

**How to apply:**
- Do not attempt to debug CI YAML or package issues when this symptom appears.
- The pipeline plumbing (branch → PR → CI trigger) works correctly — only runner
  allocation fails.
- Resolution requires the repo owner to check GitHub Actions billing/quota at:
  https://github.com/settings/billing or the org billing page.
- Once resolved, the existing ci.yml (install-gate design, pnpm 9.15.0 pinned,
  concurrency cancel, dummy Clerk keys) should work without modification.
