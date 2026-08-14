# Artillery Load Tests

HTTP load tests targeting the deployed ShivWorks Network app.

## Prerequisites

```bash
npm install -g artillery@latest
```

## Tests

### `smoke.yml` — 60-second sanity check

Confirms a deploy is breathing. 5 vusers/sec for 60 seconds against `/`,
`/sitemap.xml`, `/checkout`. Run before the heavier suites.

```bash
TARGET_URL=https://network.shivworks.com pnpm load:smoke
```

### `base.yml` — Public routes and unauthenticated API checks

Hits public pages (`/`, `/login`, `/signup`) and verifies that auth-gated API
endpoints return 401/403 rather than leaking data.

```bash
TARGET_URL=https://network.shivworks.com artillery run artillery/base.yml
```

### `authenticated.yml` — Authenticated member flows

Simulates logged-in members browsing library, settings, live, and VIP calls.
Requires a valid session cookie from a test account.

```bash
TARGET_URL=https://network.shivworks.com \
SESSION_COOKIE="__session=<clerk-session-token>" \
artillery run artillery/authenticated.yml
```

To get a session cookie: log in to the deployed app in a browser, open DevTools
→ Application → Cookies, copy the `__session` value, and pass it as shown above.

## Reports

Generate an HTML report from any run:

```bash
TARGET_URL=https://network.shivworks.com \
artillery run --output artillery/report.json artillery/base.yml

artillery report artillery/report.json
```

## Launch-blocker thresholds

A run "passes" if all of the following hold:

| Metric | Threshold |
|---|---|
| p95 latency on cached routes (`/`, `/sitemap.xml`) | < 800 ms |
| p95 latency on dynamic routes (`/dashboard`, `/library`) | < 1500 ms |
| Error rate | < 1% |
| 5xx responses | zero |
| Memory / CPU saturation in CF Pages dashboard | no sustained 100% |

If any threshold misses, do not promote to production. Tune query plan,
add an index (see `BACKEND-CONNECTION-AUDIT.md` and `INDEXES-AUDIT.md`),
or scale up before retrying.

## Where to run

| Phase | Target | Suite |
|---|---|---|
| Pre-launch (Sat May 31) | `https://staging.shivworks-network.pages.dev` | `smoke.yml` → `base.yml` → `authenticated.yml` |
| Day-of (Mon Jun 1, pre-cutover) | Same staging URL one more time | `smoke.yml` only |
| Post-cutover | `https://network.shivworks.com` | `smoke.yml` only |

