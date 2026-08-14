import { describe, expect, it, vi } from 'vitest';
import { buildProvisionedSignupPath } from '$lib/utils/provision-auth';
import { normalizeProvisionEmail, resolveAuthRouteForEmail } from './member-provision';

const { getUnclaimedImportForEmailMock } = vi.hoisted(() => ({
	getUnclaimedImportForEmailMock: vi.fn()
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getUnclaimedImportForEmail: getUnclaimedImportForEmailMock
}));

describe('normalizeProvisionEmail', () => {
	it('normalizes valid addresses', () => {
		expect(normalizeProvisionEmail(' Aaron@Example.COM ')).toBe('aaron@example.com');
	});

	it('rejects invalid addresses', () => {
		expect(normalizeProvisionEmail('not-an-email')).toBeNull();
	});
});

describe('resolveAuthRouteForEmail', () => {
	it('routes unclaimed paid imports to signup', async () => {
		getUnclaimedImportForEmailMock.mockResolvedValue({
			id: 'import_1',
			email: 'aaron@outerfields.co',
			name: 'Aaron Thomas',
			tier: 'vip',
			accessStatus: 'active',
			role: 'member',
			sourceRef: 'wc:123',
			claimedAt: null
		});

		await expect(resolveAuthRouteForEmail({} as never, 'aaron@outerfields.co')).resolves.toEqual({
			kind: 'signup',
			tier: 'vip',
			name: 'Aaron Thomas'
		});
	});

	it('routes claimed or unknown emails to signin', async () => {
		getUnclaimedImportForEmailMock.mockResolvedValue(null);

		await expect(resolveAuthRouteForEmail({} as never, 'member@example.com')).resolves.toEqual({
			kind: 'signin'
		});
	});
});

describe('buildProvisionedSignupPath', () => {
	it('builds signup url with provisioned flag', () => {
		expect(buildProvisionedSignupPath('aaron@outerfields.co', '/welcome')).toBe(
			'/signup?email=aaron%40outerfields.co&provisioned=1&redirect=%2Fwelcome'
		);
	});
});
