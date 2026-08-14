import { test, expect } from '@playwright/test';

test('community: renders community page or redirects to login/checkout (auth + paid gate)', async ({
	page
}) => {
	await page.goto('/community');
	const finalUrl = new URL(page.url());

	const validDestinations = ['/community', '/login', '/checkout'];
	const landed = validDestinations.some((p) => finalUrl.pathname.startsWith(p));
	expect(landed).toBe(true);

	if (finalUrl.pathname.startsWith('/login')) {
		// Auth gate — login page must have rendered
		const title = await page.title();
		expect(title).toMatch(/sign in|log in|login|shivworks/i);
		const body = await page.content();
		expect(body.length).toBeGreaterThan(500);
	} else if (finalUrl.pathname.startsWith('/checkout')) {
		// Paid-member gate — checkout page must have rendered with tier copy
		await expect(page).toHaveTitle(/checkout/i);
		const body = await page.content();
		expect(body).toMatch(/bronze|vip|upgrade/i);
	} else {
		// Community rendered for authenticated paid member
		await expect(page).toHaveTitle(/community/i);
		const body = await page.content();
		expect(body).toContain('ShivWorks');
	}
});
