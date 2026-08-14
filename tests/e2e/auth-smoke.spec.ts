// Auth-gated smoke tests — exercises the paid-member happy path end-to-end.
//
// Coverage:
//   1. Clerk sign-in for a known test user (env-gated).
//   2. /dashboard renders for an authenticated paid member.
//   3. /community renders after auth.
//   4. /checkout: bronze + vip buttons point at shivworkspg.com WC checkout.
//   5. /api/wc/webhook with a valid HMAC signature returns 200 success.
//   6. /api/wc/webhook with a bad signature returns 401.
//
// Everything that needs prod-only secrets is `test.skip()`-guarded rather than
// hard-failing so the suite can be safely wired into CI without leaking creds.

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:5173';

const CLERK_EMAIL = process.env.CLERK_TEST_USER_EMAIL;
const CLERK_PASSWORD = process.env.CLERK_TEST_USER_PASSWORD;
const WC_SECRET = process.env.WC_WEBHOOK_SECRET;

const HAS_CLERK_CREDS = Boolean(CLERK_EMAIL && CLERK_PASSWORD);
const HAS_WC_SECRET = Boolean(WC_SECRET);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORDER_FIXTURE_PATH = resolve(__dirname, '..', 'fixtures', 'wc-order.json');

// Sign a body the same way the WC webhook handler verifies it:
// HMAC-SHA256(secret, rawBody) → base64.
function signWcBody(rawBody: string, secret: string): string {
	return createHmac('sha256', secret).update(rawBody).digest('base64');
}

// Drive the Clerk sign-in widget. The widget mounts client-side, so we wait
// for its inputs to appear before typing. Clerk's two-step flow asks for the
// email first, then advances to a password field.
async function clerkSignIn(page: Page, email: string, password: string): Promise<void> {
	await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

	// Email step.
	const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
	await emailInput.waitFor({ state: 'visible', timeout: 20_000 });
	await emailInput.fill(email);
	await page
		.getByRole('button', { name: /continue|next|sign in/i })
		.first()
		.click();

	// Password step.
	const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
	await passwordInput.waitFor({ state: 'visible', timeout: 20_000 });
	await passwordInput.fill(password);
	await page
		.getByRole('button', { name: /continue|sign in|submit/i })
		.first()
		.click();

	// Clerk redirects to fallbackRedirectUrl on success. Wait until we leave /login.
	await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}

test.describe('auth-gated smoke', () => {
	test.describe.configure({ mode: 'serial' });

	test('Clerk sign-in flow completes for the test user', async ({ page }) => {
		test.skip(
			!HAS_CLERK_CREDS,
			'CLERK_TEST_USER_EMAIL and CLERK_TEST_USER_PASSWORD must be set to exercise the Clerk sign-in flow.'
		);

		await clerkSignIn(page, CLERK_EMAIL!, CLERK_PASSWORD!);
		// After login we land on dashboard (default) or the originally-requested route.
		expect(page.url()).not.toMatch(/\/login/);
	});

	test('/dashboard renders for an authenticated paid member', async ({ page }) => {
		test.skip(!HAS_CLERK_CREDS, 'Requires CLERK_TEST_USER_EMAIL + CLERK_TEST_USER_PASSWORD.');

		await clerkSignIn(page, CLERK_EMAIL!, CLERK_PASSWORD!);
		const response = await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
		expect(response, 'no response from /dashboard').not.toBeNull();
		expect(response!.status(), `/dashboard returned ${response!.status()}`).toBe(200);

		// Dashboard title + ShivWorks copy must be present.
		await expect(page).toHaveTitle(/dashboard|shivworks/i);
		const body = (await page.locator('body').innerText()).trim();
		expect(body.length).toBeGreaterThan(50);
		expect(body).toMatch(/shivworks/i);
	});

	test('/community renders after auth', async ({ page }) => {
		test.skip(!HAS_CLERK_CREDS, 'Requires CLERK_TEST_USER_EMAIL + CLERK_TEST_USER_PASSWORD.');

		await clerkSignIn(page, CLERK_EMAIL!, CLERK_PASSWORD!);
		const response = await page.goto(`${BASE_URL}/community`, { waitUntil: 'domcontentloaded' });
		expect(response, 'no response from /community').not.toBeNull();
		expect(response!.status()).toBe(200);

		// We should be on /community, not bounced to /checkout (paid gate) or /login.
		expect(new URL(page.url()).pathname).toBe('/community');
		await expect(page).toHaveTitle(/community|shivworks/i);
		const body = (await page.locator('body').innerText()).trim();
		expect(body).toMatch(/shivworks/i);
	});
});

test.describe('/checkout WC redirects', () => {
	// /checkout's tier buttons do `window.location.href = WC_CHECKOUT_URLS[tier]`.
	// We override the href setter so the assignment is captured instead of
	// navigating away, then assert the captured URL matches shivworkspg.com.
	test('bronze + vip buttons deep-link to shivworkspg.com WooCommerce checkout', async ({
		page
	}) => {
		test.skip(!HAS_CLERK_CREDS, 'Requires CLERK_TEST_USER_EMAIL + CLERK_TEST_USER_PASSWORD.');

		await clerkSignIn(page, CLERK_EMAIL!, CLERK_PASSWORD!);
		await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'domcontentloaded' });

		// Capture the assignment target by overriding the href setter before clicking.
		await page.addInitScript(() => {
			(window as unknown as { __redirectedTo?: string }).__redirectedTo = undefined;
		});

		for (const tier of ['bronze', 'vip'] as const) {
			await page.evaluate(() => {
				(window as unknown as { __redirectedTo?: string }).__redirectedTo = undefined;
				const proto = Object.getPrototypeOf(window.location);
				try {
					Object.defineProperty(window.location, 'href', {
						configurable: true,
						set(value: string) {
							(window as unknown as { __redirectedTo?: string }).__redirectedTo = value;
						},
						get() {
							return document.URL;
						}
					});
				} catch {
					// best effort — some browsers won't allow this
				}
				void proto;
			});

			const buttonLabel = tier === 'bronze' ? /choose bronze/i : /choose vip/i;
			await page.getByRole('button', { name: buttonLabel }).first().click();

			const captured = await page.evaluate(
				() => (window as unknown as { __redirectedTo?: string }).__redirectedTo
			);

			expect(captured, `${tier} button did not assign window.location.href`).toBeTruthy();
			expect(captured!).toMatch(
				new RegExp(
					`^https://shivworkspg\\.com/cart/\\?add-to-cart=${tier === 'bronze' ? '31517' : '31518'}$`
				)
			);

			// Reload to reset overrides before next tier.
			await page.reload({ waitUntil: 'domcontentloaded' });
		}
	});
});

test.describe('/api/wc/webhook signature gate', () => {
	let api: APIRequestContext;
	let rawBody: string;

	test.beforeAll(async ({ playwright }) => {
		api = await playwright.request.newContext({ baseURL: BASE_URL });
		rawBody = readFileSync(ORDER_FIXTURE_PATH, 'utf-8').trim();
	});

	test.afterAll(async () => {
		await api?.dispose();
	});

	test('valid signature → 200 with success:true', async () => {
		test.skip(!HAS_WC_SECRET, 'WC_WEBHOOK_SECRET must be set to exercise the webhook receiver.');

		const signature = signWcBody(rawBody, WC_SECRET!);
		const response = await api.post('/api/wc/webhook', {
			data: rawBody,
			headers: {
				'content-type': 'application/json',
				'x-wc-webhook-signature': signature
			}
		});

		expect(response.status(), `expected 200, got ${response.status()}`).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({ success: true });
	});

	test('invalid signature → 401', async () => {
		test.skip(!HAS_WC_SECRET, 'WC_WEBHOOK_SECRET must be set to exercise the webhook receiver.');

		const response = await api.post('/api/wc/webhook', {
			data: rawBody,
			headers: {
				'content-type': 'application/json',
				'x-wc-webhook-signature': 'this-is-not-a-valid-signature'
			}
		});

		expect(response.status(), `expected 401, got ${response.status()}`).toBe(401);
	});
});
