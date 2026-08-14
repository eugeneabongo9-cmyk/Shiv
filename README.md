# ShivWorks Network

Standalone repository for the ShivWorks member network.

This app is the extracted delivery surface for the ShivWorks platform:

- SvelteKit + Vite frontend
- Cloudflare Pages deployment
- Cloudflare D1 data layer in production
- Clerk for auth
- Stripe for Bronze / VIP upgrades
- Resend for transactional email
- Circle-backed community launch lane
- Cloudflare Stream-ready media foundation for multi-episode course modules

## Local development

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

Default app URL in local dev:

- `http://localhost:5173`

## Replit

This repo is prepared for GitHub import into Replit.

After import:

1. Add the required secrets in Replit Secrets.
2. Run the default workflow or:

```bash
pnpm install --frozen-lockfile=false
pnpm dev -- --host 0.0.0.0 --port 3000
```

## Required environment variables

See [.env.example](./.env.example).

Main required values:

- `PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BRONZE_PRICE_ID`
- `STRIPE_VIP_PRICE_ID`
- `RESEND_API_KEY`
- `PUBLIC_CIRCLE_COMMUNITY_URL`

Video upload values, when using Cloudflare Stream:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_API_TOKEN`
- `CLOUDFLARE_STREAM_WEBHOOK_SECRET`

## Deployment

Cloudflare deploy commands:

```bash
pnpm build
pnpm deploy
pnpm migrate
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for runtime details.

## Video content model

The app now has a durable content foundation for long-form course content:

- `courses` and `course_modules` define the curriculum.
- `course_module_episodes` lets one module contain multiple episodes.
- `media_assets` stores the external video provider state.
- `member_episode_progress` tracks member progress at the episode level.

Replit remains the editing and preview surface. Raw long-form videos should live in external video storage, not in the Replit project filesystem.
