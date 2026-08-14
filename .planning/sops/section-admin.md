# SOP — `routes/admin`

## Purpose

Internal admin console for Aaron + ShivWorks staff. Member imports, entitlement overrides, media uploads, audit visibility.

## Auth model

`requireAdmin(locals)` in every `+page.server.ts` and every `+server.ts` under `routes/api/admin/`.
Non-admin → 403 (not redirect — admins must see the failure).

## Data dependencies

- `members`, `member_imports`, `course_modules`, `course_module_episodes`, `media_assets`, `audit_log` (planned).
- `src/lib/server/admin.ts`, `src/lib/server/member-imports.ts`, `src/lib/server/stream.ts`.

## Error contract

- Member import failures: per-row error list, partial-success allowed, full report stored in `member_imports` table.
- Media upload failures: surfaced inline; tus client retries; final failure → admin sees actionable error + Sentry event ID.

## Test bar

- Unit: `member-imports.test.ts` (extend with per-row error fixtures), new `audit-log.test.ts` once table lands.
- Smoke: auth-gated path — log in as admin test user, hit `/admin`, assert page renders + a known table column header is visible.
- Manual: import a 100-row CSV, dress-rehearsal harness (task w259).

## Deploy notes

- Migrations affecting admin: gate behind a feature flag or run during maintenance window — bulk-import dress rehearsal must pass first.
- Stream uploads require `CLOUDFLARE_STREAM_API_TOKEN` + `CLOUDFLARE_STREAM_WEBHOOK_SECRET` set in Doppler `prd`.
