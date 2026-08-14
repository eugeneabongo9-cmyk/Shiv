# ShivWorks Network Deployment

## Runtime

- App: Cloudflare Pages
- Database: Cloudflare D1 in production, Postgres or SQLite locally
- Auth: Clerk
- Payments: Stripe
- Community: Circle
- Video storage: Cloudflare Stream or compatible external video storage

## Required env

- `PUBLIC_SITE_URL`
- `PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BRONZE_PRICE_ID`
- `STRIPE_VIP_PRICE_ID`
- `RESEND_API_KEY`
- `SHIVWORKS_ADMIN_EMAILS`

Required for first-class direct video uploads:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_API_TOKEN`
- `CLOUDFLARE_STREAM_WEBHOOK_SECRET`

Optional for video uploads/playback:

- `CLOUDFLARE_STREAM_ALLOWED_ORIGINS`
- `VIDEO_STREAM_TOKEN_TTL_SECONDS`

## Local workflow

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

## Cloudflare

1. Create the `shivworks-network-db` D1 database.
2. Update `wrangler.jsonc` with the real database IDs and production domain vars.
3. Set Wrangler secrets for Clerk, Stripe, and Resend.
4. Configure Clerk webhooks to post to `/api/clerk/webhook`.
5. Configure Stripe webhooks to post to `/api/stripe/webhook`.
6. Configure Cloudflare Stream webhooks to post to `/api/webhooks/stream`.

When multiple Cloudflare accounts are available locally, run migration and deploy commands with
the Create Something account selected:

```bash
CLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a pnpm migrate
```

Cloudflare Pages config does not support a top-level `account_id`, so keep account selection in
the shell environment or CI environment instead of `wrangler.jsonc`.

Set the Stream runtime secrets before enabling direct uploads. The webhook URL must already be
reachable by Cloudflare, so use the production Pages URL after the main deployment is live. Switch
to `https://network.shivworks.com` after DNS/custom-domain setup is complete.

```bash
CLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a \
CLOUDFLARE_STREAM_API_TOKEN=<stream-token-with-stream-write> \
PUBLIC_SITE_URL=https://shivworks-network.pages.dev \
CLOUDFLARE_STREAM_ALLOWED_ORIGINS=https://shivworks-network.pages.dev,https://network.shivworks.com \
pnpm stream:configure
```

The Stream API token must include `Stream Write`. The script verifies Stream access, creates or
updates the Stream webhook at `/api/webhooks/stream`, stores the returned webhook signing secret
as `CLOUDFLARE_STREAM_WEBHOOK_SECRET`, and stores the Stream API token as a Pages secret.

## Clerk

- Set the app domain to `network.shivworks.com`
- Enable email verification and forgot-password in Clerk
- Enable MFA in Clerk
- Add the webhook endpoint with `user.created`, `user.updated`, and `user.deleted`

## Stripe

- Create one-time prices for `bronze` and `vip`
- Set the price IDs in env
- Point checkout success back to `/welcome`

## Video uploads

The content database separates course/module structure from media storage:

- `media_assets` stores external media and Cloudflare Stream asset state.
- `course_module_episodes` lets a module contain multiple episodes.
- `member_episode_progress` tracks per-member progress for episode playback.

Admin upload flow:

1. Admin calls `POST /api/admin/media/uploads/init` with `moduleId`, title, file size, and optional episode metadata.
2. The app creates a draft episode and media asset row.
3. The app returns a Cloudflare Stream direct upload URL.
4. Admin client uploads the file to Stream with TUS.
5. Admin calls `POST /api/admin/media/uploads/complete`.
6. Cloudflare Stream posts lifecycle updates to `/api/webhooks/stream`.
7. Members request signed playback through `GET /api/library/episodes/:episodeId/playback`.
