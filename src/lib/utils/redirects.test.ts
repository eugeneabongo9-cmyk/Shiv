import { describe, expect, it } from 'vitest';
import {
	DEFAULT_AUTH_REDIRECT,
	buildLoginHref,
	buildSignupHref,
	sanitizeInternalRedirect
} from '$lib/utils/redirects';

describe('redirect helpers', () => {
	it('uses the dashboard as the default auth redirect', () => {
		expect(DEFAULT_AUTH_REDIRECT).toBe('/dashboard');
		expect(buildLoginHref(null)).toBe('/login?redirect=%2Fdashboard');
		expect(buildSignupHref(undefined)).toBe('/signup?redirect=%2Fdashboard');
	});

	it('preserves safe internal redirects', () => {
		expect(sanitizeInternalRedirect('/community')).toBe('/community');
		expect(buildLoginHref('/vip-calls')).toBe('/login?redirect=%2Fvip-calls');
	});

	it('rejects external or malformed redirect targets', () => {
		expect(sanitizeInternalRedirect('https://example.com')).toBe('/dashboard');
		expect(sanitizeInternalRedirect('//evil.test')).toBe('/dashboard');
		expect(sanitizeInternalRedirect(' community ')).toBe('/dashboard');
	});
});
