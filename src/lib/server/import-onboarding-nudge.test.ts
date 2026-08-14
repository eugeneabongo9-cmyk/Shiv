import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	listImportedMemberProvisionsMock,
	upsertImportedMemberProvisionMock,
	sendImportedMemberOnboardingEmailMock
} = vi.hoisted(() => ({
	listImportedMemberProvisionsMock: vi.fn(),
	upsertImportedMemberProvisionMock: vi.fn(),
	sendImportedMemberOnboardingEmailMock: vi.fn()
}));

vi.mock('$lib/server/db/shivworks', () => ({
	listImportedMemberProvisions: listImportedMemberProvisionsMock,
	upsertImportedMemberProvision: upsertImportedMemberProvisionMock
}));

vi.mock('$lib/email', () => ({
	sendImportedMemberOnboardingEmail: sendImportedMemberOnboardingEmailMock
}));

import {
	IMPORT_ONBOARDING_NUDGE_COOLDOWN_MS,
	nudgeAwaitingSignupImports,
	nudgeImportedMemberOnboarding
} from './import-onboarding-nudge';
import type { D1Compat } from '$lib/server/d1-compat';

const db = {} as D1Compat;
const runtimeEnv = {};

const baseImport = {
	id: 'imp-1',
	email: 'buyer@example.com',
	name: 'Buyer',
	tier: 'bronze' as const,
	accessStatus: 'active' as const,
	role: 'member' as const,
	sourceRef: 'wc:101',
	invitedAt: 1,
	lastEmailedAt: null as number | null,
	claimedMemberId: null,
	claimedAt: null as number | null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('import onboarding nudge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		upsertImportedMemberProvisionMock.mockResolvedValue(baseImport);
		sendImportedMemberOnboardingEmailMock.mockResolvedValue(undefined);
	});

	it('sends a single-row re-nudge for unclaimed paid imports', async () => {
		listImportedMemberProvisionsMock.mockResolvedValue([baseImport]);
		const result = await nudgeImportedMemberOnboarding(db, runtimeEnv, 'buyer@example.com', 1_000);
		expect(result).toEqual({ ok: true, status: 'sent' });
		expect(sendImportedMemberOnboardingEmailMock).toHaveBeenCalledTimes(1);
		expect(upsertImportedMemberProvisionMock).toHaveBeenCalledWith(
			db,
			expect.objectContaining({ email: 'buyer@example.com', lastEmailedAt: 1_000 })
		);
	});

	it('respects the 24h cooldown', async () => {
		listImportedMemberProvisionsMock.mockResolvedValue([{ ...baseImport, lastEmailedAt: 1_000 }]);
		const result = await nudgeImportedMemberOnboarding(
			db,
			runtimeEnv,
			'buyer@example.com',
			1_000 + IMPORT_ONBOARDING_NUDGE_COOLDOWN_MS - 1
		);
		expect(result).toEqual({ ok: true, status: 'cooldown' });
		expect(sendImportedMemberOnboardingEmailMock).not.toHaveBeenCalled();
	});

	it('bulk-nudges only active awaiting bronze/vip rows', async () => {
		listImportedMemberProvisionsMock.mockResolvedValue([
			baseImport,
			{ ...baseImport, id: 'imp-2', email: 'claimed@example.com', claimedAt: 50 },
			{
				...baseImport,
				id: 'imp-3',
				email: 'revoked@example.com',
				accessStatus: 'revoked'
			},
			{ ...baseImport, id: 'imp-4', email: 'vip@example.com', tier: 'vip' }
		]);

		const result = await nudgeAwaitingSignupImports(db, runtimeEnv, 5_000);
		expect(result.sent).toBe(2);
		expect(result.skippedClaimed).toBe(1);
		expect(result.skippedInactive).toBe(1);
		expect(sendImportedMemberOnboardingEmailMock).toHaveBeenCalledTimes(2);
	});
});
