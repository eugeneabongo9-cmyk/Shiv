import { describe, expect, it } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { resolveDbMode } from './d1-compat';

const fakeCloudflareDb = {} as D1Database;

describe('resolveDbMode', () => {
	it('prefers an explicit sqlite override even when Cloudflare D1 is present', () => {
		expect(
			resolveDbMode({
				cloudflareDb: fakeCloudflareDb,
				env: { SHIVWORKS_DB_MODE: 'sqlite' }
			})
		).toBe('sqlite');
	});

	it('accepts an explicit cloudflare d1 override', () => {
		expect(
			resolveDbMode({
				env: { SHIVWORKS_DB_MODE: 'cloudflare-d1' }
			})
		).toBe('cloudflare-d1');
	});

	it('forces sqlite in Replit preview environments', () => {
		expect(
			resolveDbMode({
				cloudflareDb: fakeCloudflareDb,
				env: { REPLIT_DEV_DOMAIN: 'example.replit.dev' }
			})
		).toBe('sqlite');
	});

	it('uses Cloudflare D1 when available outside Replit preview', () => {
		expect(
			resolveDbMode({
				cloudflareDb: fakeCloudflareDb,
				env: {}
			})
		).toBe('cloudflare-d1');
	});

	it('uses postgres when DATABASE_URL points to postgres', () => {
		expect(
			resolveDbMode({
				env: { DATABASE_URL: 'postgres://user:pass@localhost:5432/shivworks' }
			})
		).toBe('postgres');
	});

	it('falls back to sqlite with no explicit backend', () => {
		expect(resolveDbMode({ env: {} })).toBe('sqlite');
	});
});
