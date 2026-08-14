# ShivWorks Network in Replit

This repository is already scoped to the ShivWorks member app.

## Primary commands

- `pnpm install --frozen-lockfile=false`
- `pnpm dev -- --host 0.0.0.0 --port 3000`
- `pnpm check`
- `pnpm test`
- `pnpm build`

## App stack

- `SvelteKit`
- `Vite`
- `Cloudflare Pages`
- `Cloudflare D1`
- `Clerk`
- `Stripe`
- `Resend`
- `Circle`

## Runtime note

Use Node `20` in Replit. This app uses `better-sqlite3` for local D1 compatibility, and that dependency requires Node `20+`.

## Replit usage

Use Replit for product editing, previewing, and client-side iteration.

Do not replace the Cloudflare deployment or database path with Replit-managed hosting or storage unless that is a deliberate migration decision.

## Secrets to add in Replit

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
