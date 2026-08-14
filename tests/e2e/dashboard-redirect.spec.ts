import { test, expect } from '@playwright/test';

test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
	await page.goto('/dashboard');
	// After redirect chain resolves, we should be on the login page
	await expect(page).toHaveURL(/\/login/);
});
