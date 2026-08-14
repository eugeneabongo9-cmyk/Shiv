import { describe, expect, it } from 'vitest';

import {
	assertClerkKeysForRuntime,
	buildClerkHandshakeResponse,
	expandAuthorizedPartyVariants,
	isClerkProductionRuntime,
	resolveAuthorizedParties
} from './clerk';

describe('isClerkProductionRuntime', () => {
	it('is true only when ENVIRONMENT is production', () => {
		expect(isClerkProductionRuntime({ ENVIRONMENT: 'production' })).toBe(true);
		expect(isClerkProductionRuntime({ ENVIRONMENT: 'preview' })).toBe(false);
		expect(isClerkProductionRuntime({})).toBe(false);
	});
});

describe('assertClerkKeysForRuntime', () => {
	it('rejects dev keys when ENVIRONMENT is production', () => {
		expect(() =>
			assertClerkKeysForRuntime({
				ENVIRONMENT: 'production',
				PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
				CLERK_SECRET_KEY: 'sk_live_abc',
				CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_abc'
			})
		).toThrow(/same Clerk instance/);
	});

	it('requires live keys and webhook secret on production runtime', () => {
		expect(() =>
			assertClerkKeysForRuntime({
				ENVIRONMENT: 'production',
				PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
				CLERK_SECRET_KEY: 'sk_test_abc'
			})
		).toThrow(/dev keys/);

		expect(() =>
			assertClerkKeysForRuntime({
				ENVIRONMENT: 'production',
				PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_abc',
				CLERK_SECRET_KEY: 'sk_live_abc'
			})
		).toThrow(/CLERK_WEBHOOK_SIGNING_SECRET/);

		expect(() =>
			assertClerkKeysForRuntime({
				ENVIRONMENT: 'production',
				PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_abc',
				CLERK_SECRET_KEY: 'sk_live_abc',
				CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_prod'
			})
		).not.toThrow();
	});

	it('allows test keys outside production runtime', () => {
		expect(() =>
			assertClerkKeysForRuntime({
				ENVIRONMENT: 'development',
				PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
				CLERK_SECRET_KEY: 'sk_test_abc'
			})
		).not.toThrow();
	});
});

describe('expandAuthorizedPartyVariants', () => {
	it('includes www and apex variants for production hosts', () => {
		expect(expandAuthorizedPartyVariants('https://theshivworksnetwork.com')).toEqual([
			'https://theshivworksnetwork.com',
			'https://www.theshivworksnetwork.com'
		]);
	});

	it('leaves localhost unchanged', () => {
		expect(expandAuthorizedPartyVariants('http://localhost:5173')).toEqual([
			'http://localhost:5173'
		]);
	});
});

describe('resolveAuthorizedParties', () => {
	it('falls back to the canonical site url', () => {
		expect(
			resolveAuthorizedParties({
				PUBLIC_SITE_URL: 'https://shivworks-network.replit.app/'
			})
		).toEqual(['https://shivworks-network.replit.app', 'https://www.shivworks-network.replit.app']);
	});

	it('adds configured origins alongside the canonical site url', () => {
		expect(
			resolveAuthorizedParties({
				PUBLIC_SITE_URL: 'https://shivworks-network.replit.app',
				CLERK_AUTHORIZED_PARTIES:
					' https://network.shivworks.com/path , https://preview.example.replit.dev/ , https://network.shivworks.com '
			})
		).toEqual([
			'https://shivworks-network.replit.app',
			'https://www.shivworks-network.replit.app',
			'https://network.shivworks.com',
			'https://www.network.shivworks.com',
			'https://preview.example.replit.dev',
			'https://www.preview.example.replit.dev'
		]);
	});

	it('returns undefined when no origins are configured', () => {
		expect(resolveAuthorizedParties({})).toBeUndefined();
	});
});

describe('buildClerkHandshakeResponse', () => {
	it('returns a document handshake redirect for full page loads', () => {
		const clerkHeaders = new Headers({
			location: 'https://clerk.example/handshake',
			'set-cookie': '__session=abc; Path=/; HttpOnly'
		});

		const response = buildClerkHandshakeResponse(clerkHeaders, {
			isDataRequest: false
		});

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('https://clerk.example/handshake');
	});

	it('returns a client-reload signal for SvelteKit data requests', () => {
		const clerkHeaders = new Headers({
			location: 'https://clerk.example/handshake',
			'set-cookie': '__session=abc; Path=/; HttpOnly'
		});

		const response = buildClerkHandshakeResponse(clerkHeaders, {
			isDataRequest: true
		});

		expect(response.status).toBe(401);
		expect(response.headers.get('x-clerk-auth-status')).toBe('handshake');
		expect(response.headers.get('location')).toBe('https://clerk.example/handshake');
		expect(response.headers.get('set-cookie')).toContain('__session=abc');
	});
});
