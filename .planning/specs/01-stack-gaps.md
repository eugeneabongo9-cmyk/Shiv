# Spec 01 — Stack Gaps

Status of the repo as of 2026-05-26 against a production-grade SvelteKit + Cloudflare Pages baseline.

| Layer                                    | Present?                | Action                |
| ---------------------------------------- | ----------------------- | --------------------- |
| TypeScript + svelte-check                | ✅                      | none                  |
| Vitest unit tests                        | ✅ (6 files)            | extend, don't replace |
| ESLint                                   | ❌                      | §1                    |
| Prettier                                 | ❌                      | §2                    |
| Pre-commit hooks                         | ❌                      | §3                    |
| Smoke / e2e tests                        | ❌                      | §5                    |
| CI pipeline                              | ❌ (`.github/` missing) | §6                    |
| Dependency hygiene (Dependabot/Renovate) | ❌                      | §7                    |
| `editorconfig`                           | ❌                      | §2                    |

---

## §1 ESLint

**Packages**

```
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-svelte svelte-eslint-parser globals
```

**Files**

- `eslint.config.js` (flat config) — TS recommended, Svelte recommended, ignore `.svelte-kit/`, `build/`, `dist/`, `coverage/`, `node_modules/`.
- Add `"lint": "eslint ."`, `"lint:fix": "eslint . --fix"` to `package.json`.

**Acceptance**

- `pnpm lint` exits 0 on a clean tree.
- `pnpm lint` exits 1 if any `.ts` or `.svelte` file violates the configured rules.
- Rules required at error level: `no-unused-vars` (TS-aware), `no-explicit-any` (warn), `svelte/no-at-html-tags` (xss), `no-console` (warn — allow `console.error`).

## §2 Prettier + EditorConfig

**Packages**

```
pnpm add -D prettier prettier-plugin-svelte
```

**Files**

- `.prettierrc.json` — `{ "useTabs": true, "singleQuote": true, "printWidth": 100, "plugins": ["prettier-plugin-svelte"] }` (matches existing tab indentation observed in repo).
- `.prettierignore` — mirror `.gitignore` plus `pnpm-lock.yaml`, `.svelte-kit/`.
- `.editorconfig` — tabs, lf, utf-8, trim trailing whitespace.
- Scripts: `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.

**Acceptance**

- `pnpm format:check` exits 0 after one-time `pnpm format` is committed.

## §3 Pre-commit (simple-git-hooks + lint-staged)

Chosen over husky for zero post-install script footprint.

**Packages**

```
pnpm add -D simple-git-hooks lint-staged
```

**`package.json`**

```json
{
  "simple-git-hooks": { "pre-commit": "pnpm lint-staged" },
  "lint-staged": {
    "*.{ts,svelte,js,mjs}": ["eslint --fix", "prettier --write"],
    "*.{md,json,yml,yaml,css}": ["prettier --write"]
  },
  "scripts": { "prepare": "simple-git-hooks" }
}
```

**Acceptance**

- After fresh `pnpm install`, `.git/hooks/pre-commit` exists and runs lint-staged.
- A commit touching a `.ts` file with lint errors fails until `--fix` resolves them.

## §4 Unit tests — extend existing Vitest

No tooling change. Add a coverage gate.

**Packages**

```
pnpm add -D @vitest/coverage-v8
```

**`vitest.config.ts`** — add:

```ts
test: {
  coverage: { provider: 'v8', reporter: ['text', 'lcov'], thresholds: { lines: 50, functions: 50, branches: 40 } }
}
```

**Acceptance**

- `pnpm test --coverage` reports ≥ 50% line coverage (current 6 test files should hit ~30–50%; raise threshold incrementally).

## §5 Smoke tests — Playwright

**Packages**

```
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

**Files**

- `playwright.config.ts` — `webServer: { command: 'pnpm preview', port: 4173, reuseExistingServer: !process.env.CI }`, projects: `chromium`, retries: `2` in CI.
- `tests/smoke/public.spec.ts` — `/`, `/login`, `/signup`, `/welcome`, `/checkout`, `/sitemap.xml`. Assert 200 status + `body` non-empty + no `Error:` text in DOM.
- `tests/smoke/auth-gated.spec.ts` — `/dashboard`, `/library`, `/community`, `/settings`, `/vip-calls`. Use Clerk test instance: sign in via `playwright.use({ storageState: '.auth/member.json' })`. Add a `global-setup.ts` that signs in once via Clerk's testing tokens API.

**CI secrets required**

- `CLERK_TEST_INSTANCE_PUBLISHABLE_KEY` (development instance, dummy data)
- `CLERK_TEST_INSTANCE_SECRET_KEY`
- `E2E_MEMBER_EMAIL` / `E2E_MEMBER_PASSWORD`
- `E2E_VIP_EMAIL` / `E2E_VIP_PASSWORD`

Scripts: `"smoke": "playwright test"`, `"smoke:headed": "playwright test --headed"`.

**Acceptance**

- `pnpm smoke` green against a built preview server in CI.
- Auth-gated specs sign in and reach the expected route without 4xx/5xx.

## §6 CI pipeline — `.github/workflows/ci.yml`

Single workflow, parallel jobs where safe.

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
jobs:
  install:
    # cached pnpm install, fan-out artifact
  check: # svelte-check
  lint: # eslint
  format: # prettier --check
  unit: # vitest --coverage
  smoke: # playwright (depends on build)
  build: # vite build
```

**Acceptance**

- PR cannot merge unless all required checks pass (configure branch protection separately — out of scope for this PR, document in PR SOP).
- Workflow runtime under 6 min on a typical PR (pnpm cache hot).

## §7 Dependency hygiene

**Files**

- `.github/dependabot.yml` — npm weekly, github-actions weekly, grouped minor/patch.

**Acceptance**

- Dependabot opens weekly PRs.
- Renovate not added (Dependabot suffices; avoid double-bot noise).
