import { describe, expect, it } from 'vitest';
import {
	HYROS_SCRIPT_ORIGIN,
	META_PIXEL_SCRIPT_ORIGIN,
	STAPE_GTM_ORIGINS,
	buildContentSecurityPolicy
} from './csp';

describe('buildContentSecurityPolicy', () => {
	it('allowlists Stape GTM loader origins in script-src and connect-src', () => {
		const policy = buildContentSecurityPolicy(new URL('https://theshivworksnetwork.com/'), {});

		for (const origin of STAPE_GTM_ORIGINS) {
			expect(policy).toContain(origin);
		}

		const scriptSrc = policy.split('; ').find((directive) => directive.startsWith('script-src '));
		const connectSrc = policy.split('; ').find((directive) => directive.startsWith('connect-src '));

		expect(scriptSrc).toBeTruthy();
		expect(connectSrc).toBeTruthy();
		for (const origin of STAPE_GTM_ORIGINS) {
			expect(scriptSrc).toContain(origin);
			expect(connectSrc).toContain(origin);
		}
	});

	it('allows the observed Meta Pixel script origin in script-src only', () => {
		const policy = buildContentSecurityPolicy(new URL('https://theshivworksnetwork.com/'), {});
		const directives = policy.split('; ');
		const scriptSrc = directives.find((directive) => directive.startsWith('script-src '));
		const connectSrc = directives.find((directive) => directive.startsWith('connect-src '));

		expect(scriptSrc).toContain(META_PIXEL_SCRIPT_ORIGIN);
		expect(connectSrc).not.toContain(META_PIXEL_SCRIPT_ORIGIN);
	});

	it('allows the Hyros tracking script origin in script-src and connect-src', () => {
		const policy = buildContentSecurityPolicy(new URL('https://theshivworksnetwork.com/'), {});
		const directives = policy.split('; ');
		const scriptSrc = directives.find((directive) => directive.startsWith('script-src '));
		const connectSrc = directives.find((directive) => directive.startsWith('connect-src '));

		expect(scriptSrc).toContain(HYROS_SCRIPT_ORIGIN);
		expect(connectSrc).toContain(HYROS_SCRIPT_ORIGIN);
	});

	it('includes the request origin in form-action', () => {
		const policy = buildContentSecurityPolicy(new URL('https://preview.example.com/library'), {});
		expect(policy).toContain("form-action 'self'");
		expect(policy).toContain('https://preview.example.com');
	});

	it('adds the configured Circle community origin to frame-src', () => {
		const policy = buildContentSecurityPolicy(new URL('https://theshivworksnetwork.com/'), {
			PUBLIC_CIRCLE_COMMUNITY_URL: 'https://community.shivworks.circle.so/c/members'
		});
		const frameSrc = policy.split('; ').find((directive) => directive.startsWith('frame-src '));
		expect(frameSrc).toContain('https://community.shivworks.circle.so');
	});

	it('ignores non-https Circle URLs for frame-src', () => {
		const policy = buildContentSecurityPolicy(new URL('https://theshivworksnetwork.com/'), {
			PUBLIC_CIRCLE_COMMUNITY_URL: 'http://evil.example/community'
		});
		const frameSrc = policy.split('; ').find((directive) => directive.startsWith('frame-src '));
		expect(frameSrc).not.toContain('evil.example');
	});
});
