# Upcoming PR — WooCommerce → Network Webhook Receiver

**For:** Aaron (Outerfields) + Micah (CREATE SOMETHING)
**From:** Max Stern / Macks Studios
**Repo:** `createsomethingtoday/shivworks-network` (contribution PR from `Mxcks` fork)
**Branch:** `feat/wc-webhook`
**Status:** ready to build — pending one confirmation (Bronze/VIP product names)

---

## What this does

When someone buys a membership on the WooCommerce store, this endpoint provisions their Network access automatically — no manual CSV import, no member needing to exist in the Network first.

```
Buyer purchases on WooCommerce store
        │
        ▼
WooCommerce fires a webhook  →  POST /api/wc/webhook
        │
        ▼
Endpoint verifies the signature, reads the order, maps the
product to a tier (Bronze / VIP), records a pending provision
keyed by the buyer's EMAIL
        │
        ▼
Buyer later signs up to the Network with that same email (Clerk)
        │
        ▼
Network auto-grants their tier on first login. Done.
```

The buyer never has to be logged in when they pay. The Network never touches card data — WooCommerce/Fortis owns the transaction.

## Why it's low-risk

It **reuses machinery that already exists and is tested** in the backend:

- The admin CSV bulk-import already records members by email via `upsertImportedMemberProvision()`.
- First Clerk login already claims any pending email match via `ensureMemberIdentity()` → `claimImportedMemberProvision()`.

This PR just adds the _live, one-at-a-time_ version of that same flow, triggered by a webhook instead of a CSV upload. It **never touches the Stripe code** — Stripe stays dormant as the fallback, exactly as agreed. Nothing existing changes behavior.

## What the PR adds

| File                                           | Purpose                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `src/routes/api/wc/webhook/+server.ts`         | The endpoint: signature verify → parse → map tier → provision        |
| `src/lib/server/wc-webhook.ts`                 | WooCommerce signature verification (HMAC-SHA256) + payload parsing   |
| `src/lib/server/wc-webhook.test.ts`            | Unit tests: valid/invalid signature, tier mapping, idempotent replay |
| `migrations/0009_processed_webhook_events.sql` | Idempotency table — a retried webhook can't double-provision         |
| `.env.example`                                 | Documents `WC_WEBHOOK_SECRET` (stored in Infisical)                  |

## What the store side needs (Aaron / store admin)

1. In WooCommerce → Settings → Advanced → Webhooks, add a webhook:
   - **Topic:** Order updated (or Order completed)
   - **Delivery URL:** `https://network.shivworks.com/api/wc/webhook`
   - **Secret:** a shared secret, also stored in Infisical as `WC_WEBHOOK_SECRET`
2. Confirm the **product names** for Bronze and VIP (see below).

## The one fact I need before building

**What are the exact WooCommerce product names (or product IDs) for the Bronze and VIP memberships?**

- If the products contain the words "Bronze"/"Founding" and "VIP", the tier mapping works automatically (the backend already maps those words).
- If they're named anything else, I need an explicit `product → tier` map.

Everything else I can build with safe defaults. This is the only fact that affects correctness — a wrong mapping would grant the wrong membership level.

## Effort + cost

|                          |                                                  |
| ------------------------ | ------------------------------------------------ |
| Estimated effort         | 6.5 hours                                        |
| Standard rate            | $942.50                                          |
| AI-augmented rate (1/10) | **$94.25**                                       |
| Billed                   | per engagement (currently pro bono — Max's call) |

Full breakdown in `INV-009-wc-webhook.html`.

## Sequencing

This branches off the current production-readiness work. It can land independently of the remaining items (auth-gated smoke, security hardening). Recommended order: get the Bronze/VIP product names tonight → I build + open the PR → Micah reviews → merge → configure the WooCommerce webhook → test with one real (or test-mode) order.
