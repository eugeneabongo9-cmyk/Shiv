# WooCommerce Webhook Signature — Security Audit

**Date:** 2026-06-22  
**Scope:** `src/lib/server/wc-webhook-signature.ts`, handler `src/routes/api/wc/webhook/+server.ts`  
**Algorithm:** HMAC-SHA256 over raw request body, Base64-encoded digest (WooCommerce standard)

---

## Executive summary

| Area              | Before                                           | After                                          |
| ----------------- | ------------------------------------------------ | ---------------------------------------------- |
| HMAC algorithm    | HMAC-SHA256 via Web Crypto                       | Unchanged (correct)                            |
| Comparison        | Base64 **string** compare with early length exit | **32-byte digest** compare, constant-time scan |
| Header parsing    | Raw `headers.get()`                              | Trim + reject empty; dedicated helper          |
| Malformed input   | Implicit via string mismatch                     | Explicit decode + rejection reasons            |
| Test coverage     | 4 cases                                          | 25+ cases including edge attacks               |
| Replay protection | App-layer only                                   | Documented; unchanged (by design)              |

**Risk rating:** Medium → **Low** (after hardening)

---

## 1. HMAC generation

### Specification (WooCommerce)

```php
base64_encode( hash_hmac( 'sha256', $payload, $secret, true ) );
```

### Implementation

`computeWcWebhookHmacDigest()` uses `crypto.subtle.importKey` + `crypto.subtle.sign` with `{ name: 'HMAC', hash: 'SHA-256' }` over UTF-8 encoded raw body bytes.

**Verdict:** Correct and matches WooCommerce.

---

## 2. Signature comparison (timing attacks)

### Finding (before)

```typescript
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;  // ← timing leak: early exit on length
  ...
}
```

Comparing Base64 strings leaks:

- Whether attacker-supplied signature length matches expected (44 chars for SHA-256)
- Faster rejection for hex vs base64 encodings

### Remediation

1. Decode header to fixed **32-byte** digest (`decodeWcWebhookSignatureBase64`)
2. Compare with `timingSafeEqualDigest(expected, provided)`:
   - Always iterates all 32 bytes
   - Wrong/null length still runs full loop; sets `diff` bit via length flag

**Verdict:** No known timing leaks on digest comparison path.

---

## 3. Header parsing

| Case                        | Behavior                                   |
| --------------------------- | ------------------------------------------ |
| Missing header              | `missing_header`                           |
| `null` / `undefined`        | `missing_header`                           |
| Empty / whitespace-only     | `missing_header` (after trim)              |
| Leading/trailing whitespace | Trimmed before decode                      |
| `X-WC-Webhook-Signature`    | Fetch API case-insensitive `headers.get()` |

Handler uses `readWcWebhookSignatureHeader(request.headers)`.

---

## 4. Malformed input handling

| Input                                | Result                |
| ------------------------------------ | --------------------- |
| Invalid Base64 chars                 | `malformed_signature` |
| Truncated Base64 (wrong byte length) | `malformed_signature` |
| Hex-encoded digest (64 hex chars)    | `malformed_signature` |
| `sha256=<base64>` prefix             | `malformed_signature` |
| Empty secret                         | `empty_secret`        |
| Valid Base64, wrong HMAC             | `invalid_signature`   |

Body read occurs **before** signature verify (required for HMAC). Oversized bodies rejected by `readTextBody` (512 KB cap).

---

## 5. Replay attempts

**Cryptographic layer:** A valid `(body, signature)` pair can be replayed indefinitely — HMAC proves integrity and authenticity at a point in time, not freshness.

**Application layer (existing):** `webhook_events.event_key = wc:order:{id}` pipeline prevents duplicate provisioning.

| Attack                                    | Crypto layer                  | App layer                         |
| ----------------------------------------- | ----------------------------- | --------------------------------- |
| Replay same signed delivery               | Passes HMAC                   | Idempotent no-op when `completed` |
| Re-sign different body with stolen secret | Passes if secret compromised  | N/A — secret rotation required    |
| Valid sig on tampered body                | **Fails** `invalid_signature` | —                                 |

---

## 6. Automated test matrix

File: `src/lib/server/wc-webhook-signature.test.ts`

| Test case                        | Covered                                     |
| -------------------------------- | ------------------------------------------- |
| Valid signature                  | ✓                                           |
| Invalid signature (wrong secret) | ✓                                           |
| Missing header                   | ✓                                           |
| Empty secret                     | ✓                                           |
| Truncated signature              | ✓                                           |
| Malformed Base64                 | ✓                                           |
| Wrong algorithm encoding (hex)   | ✓                                           |
| `sha256=` prefix                 | ✓                                           |
| Tampered body                    | ✓                                           |
| Whitespace-padded header         | ✓                                           |
| Replay same body+sig twice       | ✓ (crypto passes; app idempotency separate) |
| Sig for body A on body B         | ✓ fails                                     |

E2E: `tests/e2e/auth-smoke.spec.ts` — valid → 200, invalid → 401.

---

## 7. Residual risks

| Risk                                                  | Severity | Mitigation                                                             |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| Stolen `WC_WEBHOOK_SECRET`                            | Critical | Secret validation module, Infisical/CF encrypted env, rotation runbook |
| No timestamp/nonce in WC protocol                     | Low      | Idempotent event pipeline                                              |
| `nodejs_compat` not used for native `timingSafeEqual` | Low      | Portable 32-byte loop is sufficient for fixed HMAC output              |
| Side-channel via HMAC compute time vs body size       | Info     | Body size capped at 512 KB                                             |

---

## 8. Rollback

Revert to previous `wc-webhook.ts` inline verifier if needed. Handler continues to call `verifyWcSignature()` — re-exports preserve API compatibility.

---

## 9. Deployment checklist

- [ ] `WC_WEBHOOK_SECRET` matches WooCommerce webhook secret exactly
- [ ] `pnpm test src/lib/server/wc-webhook-signature.test.ts` passes
- [ ] E2E smoke with real secret returns 401 on bad sig
- [ ] WooCommerce test delivery succeeds after deploy
