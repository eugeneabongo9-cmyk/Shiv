import { describe, expect, it } from 'vitest';
import { setPublicCache, setAnonOnlyCache, setNoStore, CACHE_TTL } from './cache';

function makeRecorder() {
	const calls: Record<string, string>[] = [];
	const setHeaders = (headers: Record<string, string>) => {
		const norm: Record<string, string> = {};
		for (const [k, v] of Object.entries(headers)) norm[k.toLowerCase()] = v;
		calls.push(norm);
	};
	return { setHeaders, calls };
}

describe('setPublicCache', () => {
	it('emits public + s-maxage', () => {
		const r = makeRecorder();
		setPublicCache(r.setHeaders, CACHE_TTL.LONG);
		expect(r.calls[0]['cache-control']).toContain('public');
		expect(r.calls[0]['cache-control']).toContain('max-age=3600');
		expect(r.calls[0]['cache-control']).toContain('s-maxage=3600');
		expect(r.calls[0]['vary']).toContain('Accept-Encoding');
	});
});

describe('setAnonOnlyCache', () => {
	it('caches for anonymous visitors (no locals.user)', () => {
		const r = makeRecorder();
		setAnonOnlyCache(r.setHeaders, {}, CACHE_TTL.SHORT);
		expect(r.calls[0]['cache-control']).toContain('public');
		expect(r.calls[0]['cache-control']).toContain('max-age=60');
		expect(r.calls[0]['vary']).toContain('Cookie');
	});

	it('does not cache for authenticated visitors (locals.user set)', () => {
		const r = makeRecorder();
		setAnonOnlyCache(r.setHeaders, { user: { clerkUserId: 'u_123' } }, CACHE_TTL.SHORT);
		expect(r.calls[0]['cache-control']).toContain('private');
		expect(r.calls[0]['cache-control']).toContain('no-store');
	});

	it('also reads locals.auth.isAuthenticated', () => {
		const r = makeRecorder();
		setAnonOnlyCache(r.setHeaders, { auth: { isAuthenticated: true } }, 30);
		expect(r.calls[0]['cache-control']).toContain('private');
	});
});

describe('setNoStore', () => {
	it('emits no-store no-cache must-revalidate', () => {
		const r = makeRecorder();
		setNoStore(r.setHeaders);
		expect(r.calls[0]['cache-control']).toContain('no-store');
		expect(r.calls[0]['cache-control']).toContain('no-cache');
		expect(r.calls[0]['cache-control']).toContain('must-revalidate');
	});
});

describe('CACHE_TTL', () => {
	it('exposes expected default windows', () => {
		expect(CACHE_TTL.LONG).toBe(3600);
		expect(CACHE_TTL.MEDIUM).toBe(300);
		expect(CACHE_TTL.SHORT).toBe(60);
	});
});
