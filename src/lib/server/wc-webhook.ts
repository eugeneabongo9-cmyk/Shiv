// WooCommerce webhook helpers — signature verification, payload parsing,
// and product-ID → tier mapping for the ShivWorks Network purchase pipeline.
//
// WooCommerce signs webhook bodies with HMAC-SHA256 using a shared secret,
// then base64-encodes the digest and puts it in the `x-wc-webhook-signature`
// header. Verification = recompute the same HMAC over the raw body and
// constant-time-compare.
//
// Product IDs that map to membership tiers:
//   31517 → bronze
//   31518 → vip
// Anything else → null (the webhook returns 200 + ignored:true so WC stops
// retrying, but the order does not provision a Network membership).
//
// Ledger entry: 2026-05-29 · w358 · INV-009 · WooCommerce webhook receiver.

import type { PaidMembershipTier } from '$lib/constants/tiers';
import { WcOrderSchema } from '$lib/server/schemas/wc-order';

export {
	verifyWcSignature,
	verifyWcSignatureDetailed,
	computeWcWebhookSignatureBase64,
	readWcWebhookSignatureHeader,
	WC_WEBHOOK_SIGNATURE_HEADER,
	type WcSignatureFailureReason,
	type WcSignatureVerificationResult
} from '$lib/server/wc-webhook-signature';

// ─── 1. SIGNATURE VERIFICATION ────────────────────────────────────────────────
// Implemented in wc-webhook-signature.ts (re-exported above).

// ─── 2. PAYLOAD PARSING ───────────────────────────────────────────────────────

// Bronze (founding-member) — confirmed against the live store checkout HTML.
export const WC_BRONZE_PRODUCT_ID = 31517;
// VIP (founding-member) — confirmed against the live store checkout HTML.
export const WC_VIP_PRODUCT_ID = 31518;

export function mapProductIdToTier(productId: number): PaidMembershipTier | null {
	if (productId === WC_BRONZE_PRODUCT_ID) return 'bronze';
	if (productId === WC_VIP_PRODUCT_ID) return 'vip';
	return null;
}

export interface WcLineItem {
	product_id: number;
	name?: string;
	quantity?: number;
}

export interface WcBilling {
	email: string;
	first_name?: string;
	last_name?: string;
}

export interface WcOrder {
	id: number;
	status: string; // pending | processing | completed | refunded | cancelled | failed | on-hold
	billing: WcBilling;
	line_items: WcLineItem[];
}

/**
 * Zod-validated payload parser. Returns the typed order or null if the shape
 * is wrong. (w427-a: replaced the hand-rolled validator with a Zod schema.)
 */
export function parseWcOrder(raw: unknown): WcOrder | null {
	const result = WcOrderSchema.safeParse(raw);
	if (!result.success) return null;
	return result.data;
}

// ─── 3. TIER FROM LINE ITEMS ──────────────────────────────────────────────────

/**
 * Determine the membership tier this order grants by inspecting its line items.
 * VIP wins over Bronze if both are present (rare — combo bundles). Returns null
 * if no line item maps to a tier (gear, accessories, etc.).
 */
export function tierFromOrder(order: WcOrder): PaidMembershipTier | null {
	let tier: PaidMembershipTier | null = null;
	for (const item of order.line_items) {
		const mapped = mapProductIdToTier(item.product_id);
		if (mapped === 'vip') return 'vip';
		if (mapped === 'bronze') tier = 'bronze';
	}
	return tier;
}

// ─── 4. BUILD A DISPLAY NAME FROM BILLING ────────────────────────────────────

export function nameFromBilling(billing: WcBilling): string {
	const parts = [billing.first_name, billing.last_name].filter(
		(p): p is string => !!p && p.length > 0
	);
	return parts.join(' ').trim() || billing.email || 'Member';
}
