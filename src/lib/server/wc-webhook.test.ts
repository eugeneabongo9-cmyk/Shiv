import { describe, expect, it } from 'vitest';
import {
	verifyWcSignature,
	parseWcOrder,
	tierFromOrder,
	mapProductIdToTier,
	nameFromBilling,
	WC_BRONZE_PRODUCT_ID,
	WC_VIP_PRODUCT_ID
} from './wc-webhook';

describe('mapProductIdToTier', () => {
	it('maps known product IDs', () => {
		expect(mapProductIdToTier(WC_BRONZE_PRODUCT_ID)).toBe('bronze');
		expect(mapProductIdToTier(WC_VIP_PRODUCT_ID)).toBe('vip');
	});
	it('returns null for unknown products', () => {
		expect(mapProductIdToTier(99999)).toBeNull();
		expect(mapProductIdToTier(0)).toBeNull();
	});
});

describe('parseWcOrder', () => {
	const valid = {
		id: 42,
		status: 'completed',
		billing: { email: 'buyer@example.com', first_name: 'Jane', last_name: 'Doe' },
		line_items: [{ product_id: WC_BRONZE_PRODUCT_ID, name: 'Bronze', quantity: 1 }]
	};

	it('accepts a valid payload', () => {
		const order = parseWcOrder(valid);
		expect(order?.id).toBe(42);
		expect(order?.billing.email).toBe('buyer@example.com');
		expect(order?.line_items[0].product_id).toBe(WC_BRONZE_PRODUCT_ID);
	});

	it('coerces stringified numerics (WC sometimes sends strings)', () => {
		const order = parseWcOrder({ ...valid, id: '42', line_items: [{ product_id: '31517' }] });
		expect(order?.id).toBe(42);
		expect(order?.line_items[0].product_id).toBe(31517);
	});

	it('rejects missing email', () => {
		expect(parseWcOrder({ ...valid, billing: { email: '' } })).toBeNull();
	});

	it('rejects missing line_items', () => {
		expect(parseWcOrder({ ...valid, line_items: null })).toBeNull();
	});

	it('rejects non-object input', () => {
		expect(parseWcOrder(null)).toBeNull();
		expect(parseWcOrder('hello')).toBeNull();
		expect(parseWcOrder(42)).toBeNull();
	});
});

describe('tierFromOrder', () => {
	const base = {
		id: 1,
		status: 'completed' as const,
		billing: { email: 'x@x.com' }
	};

	it('picks bronze from a bronze line item', () => {
		expect(tierFromOrder({ ...base, line_items: [{ product_id: WC_BRONZE_PRODUCT_ID }] })).toBe(
			'bronze'
		);
	});

	it('picks vip from a vip line item', () => {
		expect(tierFromOrder({ ...base, line_items: [{ product_id: WC_VIP_PRODUCT_ID }] })).toBe('vip');
	});

	it('vip wins over bronze when both present', () => {
		expect(
			tierFromOrder({
				...base,
				line_items: [{ product_id: WC_BRONZE_PRODUCT_ID }, { product_id: WC_VIP_PRODUCT_ID }]
			})
		).toBe('vip');
	});

	it('returns null when no membership product is in the order', () => {
		expect(tierFromOrder({ ...base, line_items: [{ product_id: 999 }] })).toBeNull();
	});
});

describe('nameFromBilling', () => {
	it('joins first + last', () => {
		expect(nameFromBilling({ email: 'x@x.com', first_name: 'Jane', last_name: 'Doe' })).toBe(
			'Jane Doe'
		);
	});
	it('falls back to email when no name', () => {
		expect(nameFromBilling({ email: 'x@x.com' })).toBe('x@x.com');
	});
	it('falls back to "Member" with no email or name', () => {
		expect(nameFromBilling({ email: '' })).toBe('Member');
	});
});

describe('verifyWcSignature', () => {
	const secret = 'a7f3c9e2b1d84f6a0e5c8b2d9f1a4e7c';
	const body = JSON.stringify({ id: 1, hello: 'world' });

	it('accepts a valid signature', async () => {
		const { computeWcWebhookSignatureBase64 } = await import('./wc-webhook-signature');
		const sig = await computeWcWebhookSignatureBase64(body, secret);
		expect(await verifyWcSignature(body, sig, secret)).toBe(true);
	});

	it('rejects a wrong signature', async () => {
		const { computeWcWebhookSignatureBase64 } = await import('./wc-webhook-signature');
		const sig = await computeWcWebhookSignatureBase64(body, 'different-secret-value-32chars!');
		expect(await verifyWcSignature(body, sig, secret)).toBe(false);
	});

	it('rejects a missing signature header', async () => {
		expect(await verifyWcSignature(body, null, secret)).toBe(false);
	});

	it('rejects a tampered body', async () => {
		const { computeWcWebhookSignatureBase64 } = await import('./wc-webhook-signature');
		const sig = await computeWcWebhookSignatureBase64(body, secret);
		expect(await verifyWcSignature(body + 'tampered', sig, secret)).toBe(false);
	});
});
