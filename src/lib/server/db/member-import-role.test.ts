import { describe, expect, it } from 'vitest';
import { resolveRoleAfterImportClaim } from './shivworks';

describe('resolveRoleAfterImportClaim', () => {
	it('does not elevate imported members to admin', () => {
		expect(resolveRoleAfterImportClaim('member')).toBe('member');
		expect(resolveRoleAfterImportClaim(null)).toBe('member');
	});

	it('does not demote an existing administrator who claims an entitlement', () => {
		expect(resolveRoleAfterImportClaim('admin')).toBe('admin');
	});
});
