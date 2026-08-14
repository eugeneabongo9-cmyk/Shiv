import { test, expect } from '@playwright/test';

test('sitemap.xml returns 200 with XML content', async ({ request }) => {
	const response = await request.get('/sitemap.xml');
	expect(response.status()).toBe(200);
	const body = await response.text();
	expect(body).toContain('<urlset');
});
