# SOP — `routes/checkout`

## Purpose

Conversion surface for Bronze + VIP tiers. Stripe Checkout Session creation, redirect, return-from-success handling. Revenue-critical — every defect is measurable in dollars.

## Auth model

`requireAuthenticated` (members must log in or sign up before paying). Anonymous → `/login?redirect=/checkout`.

## Data dependencies

- `members` (current entitlement state)
- `tiers` constants in `src/lib/constants/tiers.ts`
- `STRIPE_BRONZE_PRICE_ID`, `STRIPE_VIP_PRICE_ID`
- Stripe Checkout Session API via `api/stripe/checkout/+server.ts`

## Error contract

- Stripe API failure → `+error.svelte` boundary renders **"Your payment was not charged"** with retry CTA + Sentry event ID. Code `UPSTREAM_FAILURE`.
- Member already entitled → redirect to `/dashboard` (not error).
- Webhook misfire (paid but no entitlement after 30s) → admin alert (handled by Sentry rule on `UPSTREAM_FAILURE` from `scope=stripe.webhook`).

## Conversion guardrails

- Tier toggle component (existing) is the only place tier is selected. Do **not** add a second selector elsewhere — single source of truth.
- Form fields must be readable on dark backgrounds (task w357 is the open bug).
- Founding-member urgency block (task w257) lives here, conditional on `featureFlag('founding_member_active')`.

## Test bar

- Unit: tier-card render, Stripe session payload construction (mock Stripe).
- Smoke: public path — `/checkout` loads with both tier cards visible, "Continue to payment" button is enabled. Auth-gated path — logged-in member sees correct CTA per current entitlement state.
- Manual: full Stripe test-card purchase end-to-end before any release that touches this file.

## Deploy notes

- Touching this route in a PR triggers a smoke run against a Stripe test mode webhook receiver.
- Never deploy a checkout change on a Friday.
