// Public-route smoke tests — every route here must work unauthenticated.
// Ledger entry: 2026-05-26 · INV-003a.
//
// What each test verifies:
//   1. HTTP status is 200 (not 4xx/5xx).
//   2. <body> has visible content (not a blank shell).
//   3. No "Error:" text leaks into the rendered HTML (would mean +error.svelte
//      caught something it shouldnt have).

import { test, expect } from '@playwright/test';

type SmokeRoute = {
	path: string;
	title?: RegExp;
	// Optional CSS selector that MUST be present for the page to count as healthy.
	expect?: string;
};

const ROUTES: SmokeRoute[] = [
	{ path: '/', title: /ShivWorks/i },
	{ path: '/welcome', title: /ShivWorks/i },
	{ path: '/login', title: /ShivWorks/i },
	{ path: '/signup', title: /ShivWorks/i },
	{ path: '/checkout', title: /ShivWorks/i }
];

for (const route of ROUTES) {
	test(`public route ${route.path} renders without error`, async ({ page }) => {
		const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
		expect(response, `no response for ${route.path}`).not.toBeNull();
		expect(response!.status(), `${route.path} returned ${response!.status()}`).toBe(200);

		// Body has non-trivial content.
		const bodyText = (await page.locator('body').innerText()).trim();
		expect(bodyText.length, `${route.path} body was empty`).toBeGreaterThan(20);

		// No raw error leakage. The +error.svelte boundary uses the word "error"
		// in its UI, so we look for the unrecoverable JS shape "Error:" which is
		// what an unhandled throw renders.
		const html = await page.content();
		expect(html, `${route.path} leaked a raw Error: marker`).not.toMatch(/(?:^|>)\s*Error:\s/);

		if (route.title) {
			await expect(page).toHaveTitle(route.title);
		}
		if (route.expect) {
			await expect(page.locator(route.expect)).toBeVisible();
		}
	});
}

test('sitemap.xml is served as XML', async ({ request }) => {
	const response = await request.get('/sitemap.xml');
	expect(response.status()).toBe(200);
	const contentType = response.headers()['content-type'] ?? '';
	expect(contentType).toMatch(/xml/);
	const body = await response.text();
	expect(body).toContain('<urlset');
});
