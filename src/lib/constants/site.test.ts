import { describe, expect, it } from 'vitest';
import { WC_CHECKOUT_URLS, WC_MY_ACCOUNT_URL } from './site';
import { WC_BRONZE_PRODUCT_ID, WC_VIP_PRODUCT_ID } from '$lib/server/wc-webhook';

describe('billing portal constants', () => {
	it('points to the WooCommerce my-account URL', () => {
		expect(WC_MY_ACCOUNT_URL).toMatch(/\/my-account\/?$/);
		expect(WC_MY_ACCOUNT_URL).toContain('shivworkspg.com');
	});
});

describe('WooCommerce buy-button deep links', () => {
	// Regression: /checkout/?add-to-cart=<id> drops the product on a cold
	// session and strands the buyer on an empty cart.
	it.each(['bronze', 'vip'] as const)('adds %s to the cart page, not checkout', (tier) => {
		const url = new URL(WC_CHECKOUT_URLS[tier]);
		expect(url.pathname).toBe('/cart/');
		expect(WC_CHECKOUT_URLS[tier]).not.toContain('/checkout/');
	});

	it('deep-links the same product IDs the webhook maps to a tier', () => {
		expect(new URL(WC_CHECKOUT_URLS.bronze).searchParams.get('add-to-cart')).toBe(
			String(WC_BRONZE_PRODUCT_ID)
		);
		expect(new URL(WC_CHECKOUT_URLS.vip).searchParams.get('add-to-cart')).toBe(
			String(WC_VIP_PRODUCT_ID)
		);
	});
});
