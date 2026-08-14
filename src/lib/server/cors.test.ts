import { describe, expect, it } from 'vitest';
import { corsHeadersForRequest, isAllowedCorsOrigin, rejectDisallowedBrowserOrigin } from './cors';

describe('cors allowlist', () => {
	it('allows the WooCommerce store origins', () => {
		expect(isAllowedCorsOrigin('https://shivworkspg.com')).toBe(true);
		expect(isAllowedCorsOrigin('https://www.shivworkspg.com')).toBe(true);
	});

	it('rejects unknown origins', () => {
		expect(isAllowedCorsOrigin('https://evil.example')).toBe(false);
		expect(isAllowedCorsOrigin(null)).toBe(false);
	});

	it('returns ACAO only for allowlisted browser origins', () => {
		const allowed = new Request('https://network.example/api/members', {
			headers: { Origin: 'https://shivworkspg.com' }
		});
		const blocked = new Request('https://network.example/api/members', {
			headers: { Origin: 'https://evil.example' }
		});

		expect(corsHeadersForRequest(allowed)['Access-Control-Allow-Origin']).toBe(
			'https://shivworkspg.com'
		);
		expect(corsHeadersForRequest(blocked)['Access-Control-Allow-Origin']).toBeUndefined();
	});

	it('rejects disallowed browser origins with 403', () => {
		const request = new Request('https://network.example/api/members', {
			headers: { Origin: 'https://evil.example' }
		});
		const response = rejectDisallowedBrowserOrigin(request);
		expect(response?.status).toBe(403);
	});

	it('allows requests without an Origin header', () => {
		const request = new Request('https://network.example/api/members');
		expect(rejectDisallowedBrowserOrigin(request)).toBeNull();
	});
});
