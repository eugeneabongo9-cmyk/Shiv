# Auth Smoke — Manual Setup (w428)

The Playwright auth-gated smoke (`tests/e2e/auth-smoke.spec.ts`) needs a real
Clerk test user. I cannot create one without Clerk dashboard access, so this
file documents the manual steps. Once done, the tests will run unattended.

## 1. Create a Clerk test user

1. Open the Clerk dashboard for the ShivWorks Network app.
2. Users → Create user. Use a throwaway email you control, e.g.
   `playwright-smoke@shivworks.test`. Set a strong password and turn OFF
   email/SMS verification for this user (Settings → User & Authentication →
   Email/Phone, allow password-only sign-in for this account).
3. In D1, mark this user's email as a paid member so /community and
   /dashboard render (so the test is not bounced to /checkout):

   ```sql
   -- Run via: pnpm db:shell "<sql>"
   INSERT INTO imported_member_provisions (email, name, tier, access_status, role, source_ref)
   VALUES ('playwright-smoke@shivworks.test', 'Playwright Smoke', 'bronze',
           'active', 'member', 'manual:smoke')
   ON CONFLICT(email) DO UPDATE SET tier='bronze', access_status='active';
   ```

   Then sign in once as that user in a browser so `ensureMemberIdentity`
   claims the provision and the Clerk user gets the bronze tier in
   `member_profiles`.

## 2. Export the env vars before running the suite

```bash
export TEST_BASE_URL=https://shivworks-network.pages.dev  # or prod URL
export CLERK_TEST_USER_EMAIL=playwright-smoke@shivworks.test
export CLERK_TEST_USER_PASSWORD='<the password you set>'
export WC_WEBHOOK_SECRET='<the same secret WC is configured with>'
pnpm test:e2e:auth
```

## 3. Notes

- All four env vars are independently skip-guarded. Missing creds skip the
  affected tests; they don't fail.
- The webhook test uses the existing fixture at `tests/fixtures/wc-order.json`
  and signs it with HMAC-SHA256 + base64, matching the prod verifier in
  `src/lib/server/wc-webhook.ts`.
- Local dev: omit `TEST_BASE_URL` to default to `http://localhost:5173` and
  run against `pnpm dev`.
