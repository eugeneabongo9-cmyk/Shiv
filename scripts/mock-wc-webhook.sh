#!/usr/bin/env bash
# Replay a fake WooCommerce order payload against a local /api/wc/webhook.
# Signs the body with the dev WC_WEBHOOK_SECRET so the endpoint accepts it.
#
# Usage:
#   pnpm dev:secrets &              # start the dev server with Infisical
#   bash scripts/mock-wc-webhook.sh
#
# Or against a deployed preview:
#   TARGET=https://shivworks-network-preview.pages.dev \
#   WC_WEBHOOK_SECRET=... \
#   bash scripts/mock-wc-webhook.sh
set -euo pipefail

TARGET="${TARGET:-http://localhost:5173}"
SECRET="${WC_WEBHOOK_SECRET:-dev-secret-not-used-in-prod}"
FIXTURE="${FIXTURE:-tests/fixtures/wc-order.json}"

if [[ ! -f "$FIXTURE" ]]; then
  echo "fixture not found: $FIXTURE" >&2
  exit 1
fi

BODY="$(cat "$FIXTURE")"
# WC signs the raw body with HMAC-SHA256 and base64-encodes the digest.
SIG="$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)"

echo "→ POST $TARGET/api/wc/webhook"
echo "→ fixture: $FIXTURE"
echo "→ signature: ${SIG:0:16}..."
echo ""

curl -sS -X POST "$TARGET/api/wc/webhook" \
  -H "Content-Type: application/json" \
  -H "x-wc-webhook-signature: $SIG" \
  -H "x-wc-webhook-topic: order.updated" \
  --data-binary "$BODY" | jq . || true
