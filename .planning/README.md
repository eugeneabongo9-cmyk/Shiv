# ShivWorks Network — Planning Bundle

Authored 2026-05-26 during intake against fork `Mxcks/shivworks-network` @ `main`.

Purpose: close the gaps in tooling, security, and error handling so the network app is production-grade ahead of the Jun 1 beta. Every gap is converted into a discrete PR with its own _PR-Invoice_ so cost and scope are visible up front.

## How to read this bundle

1. **`specs/`** — what's missing and how to fix it.
   - `01-stack-gaps.md` — lint, format, smoke, pre-commit, CI, dependency hygiene.
   - `02-security.md` — secrets, auth hardening, webhook idempotency, headers, rate limits.
   - `03-error-handling.md` — Sentry SDK, `+error.svelte` boundaries, `handleError` hook, taxonomy.

2. **`sops/`** — repeatable procedure for every recurring activity.
   - `00-pull-requests.md` — branch, commit, review, merge, PR-Invoice attach.
   - `section-*.md` — one per route surface; auth model, data deps, error contract, test bar, deploy notes.

3. **`templates/pr-invoice.html`** — the deliverable attached to every PR. Lists files touched, hours, rate, total.

4. **`invoices/INV-XXX-*.html`** — pre-filled PR-Invoices for each planned PR. Authored before code so the client sees the bill before the work.

## Rate card (assumed)

| Role          | Blended rate | Use when                                         |
| ------------- | ------------ | ------------------------------------------------ |
| Junior dev    | $85 / hr     | Glue work, config files, test scaffolds          |
| Mid-level dev | $125 / hr    | Most feature + tooling work                      |
| Senior dev    | $175 / hr    | Security review, architecture, incident response |

Override per-line if the actual contractor's rate differs.

## Planned PR sequence

| #   | PR                                                             | Spec ref       | Est. hrs     | Est. cost     |
| --- | -------------------------------------------------------------- | -------------- | ------------ | ------------- |
| 001 | Lint + Format baseline                                         | 01 §1, §2      | 3.5          | $437.50       |
| 002 | Pre-commit hooks                                               | 01 §3          | 1.5          | $157.50       |
| 003 | Smoke tests (Playwright)                                       | 01 §5          | 6.0          | $750.00       |
| 004 | Sentry SDK wiring                                              | 03 §1          | 4.0          | $500.00       |
| 005 | Error boundaries + handleError                                 | 03 §2, §3      | 5.0          | $650.00       |
| 006 | CI pipeline                                                    | 01 §6          | 4.0          | $480.00       |
| 007 | Security hardening (webhooks, validation, rate limit, headers) | 02 §2/§5/§6/§7 | 8.0          | $1,275.00     |
| 008 | Governance (CODEOWNERS, Dependabot, contributing)              | 01 §7, sop 00  | 2.0          | $210.00       |
| —   | **Total**                                                      |                | **34.0 hrs** | **$4,460.00** |

Numbers are reproducible by running `node .planning/invoices/render.mjs` (reads `invoices.json` → emits 8 HTML files + grand total).

> **Estimate vs final.** The currently rendered invoices are **pre-execution estimates** — stamped `ESTIMATE` in the top-right corner. After each wave merges, the corresponding `invoices.json` entry is updated with the **actual** hours and **actual** file lists drawn from `.planning/LEDGER.md`, the renderer re-runs, and the stamp flips to `FINAL`. The final paid PDFs live in `.planning/invoices/paid/`.

Margin/overhead not included. If routed through Macks Studios at a fixed-bid blended rate, add markup as appropriate.
