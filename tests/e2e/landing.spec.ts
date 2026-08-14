import { test, expect } from '@playwright/test';

test('landing page loads with 200', async ({ page }) => {
	const response = await page.goto('/');
	expect(response?.status()).toBe(200);
	await expect(page).toHaveTitle(/ShivWorks/i);
});
