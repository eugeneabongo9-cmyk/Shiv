import { test, expect } from '@playwright/test';

test('checkout: renders checkout page or redirects to login (auth required)', async ({ page }) => {
	await page.goto('/checkout');
	const finalUrl = new URL(page.url());

	if (finalUrl.pathname.startsWith('/login')) {
		// Auth wall working — login page must have rendered
		const title = await page.title();
		expect(title).toMatch(/sign in|log in|login|shivworks/i);
		const body = await page.content();
		expect(body.length).toBeGreaterThan(500);
	} else {
		// Checkout rendered — verify the checkout page content
		expect(finalUrl.pathname).toBe('/checkout');
		await expect(page).toHaveTitle(/checkout/i);
		const body = await page.content();
		// Checkout page must mention tier selection or upgrade copy
		expect(body).toMatch(/bronze|vip|upgrade|stripe/i);
	}
});

test('checkout page title is set when rendered', async ({ page }) => {
	await page.goto('/checkout');
	const title = await page.title();
	expect(title).toMatch(/ShivWorks/i);
});
