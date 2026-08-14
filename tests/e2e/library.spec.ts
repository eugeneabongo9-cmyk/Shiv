import { test, expect } from '@playwright/test';

test('library index: renders library page or redirects to login (auth wall)', async ({ page }) => {
	await page.goto('/library');
	const finalUrl = new URL(page.url());

	if (finalUrl.pathname.startsWith('/login')) {
		// Auth wall is working — verify the login page actually rendered
		const title = await page.title();
		expect(title).toMatch(/sign in|log in|login|shivworks/i);
		// Login page has a visible form or CTA — not a blank/error page
		const body = await page.content();
		expect(body.length).toBeGreaterThan(500);
	} else {
		// Authenticated path — library page should have rendered
		expect(finalUrl.pathname).toBe('/library');
		await expect(page).toHaveTitle(/library/i);
		const body = await page.content();
		expect(body).toContain('ShivWorks');
	}
});
