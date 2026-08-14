import { describe, expect, it, vi, beforeEach } from 'vitest';
import { revokeSessionWithAudit } from './session-revocation';
import { insertSessionRevocationEvent } from './db/session-revocation';
import { revokeMemberSession } from './db/shivworks';
import { sendSessionSecurityEmail } from '$lib/email';
import type { ClerkClient } from '@clerk/backend';
import type { D1Compat } from './d1-compat';

vi.mock('./db/session-revocation', () => ({
	insertSessionRevocationEvent: vi.fn()
}));

vi.mock('./db/shivworks', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./db/shivworks')>();
	return {
		...actual,
		revokeMemberSession: vi.fn()
	};
});

vi.mock('$lib/email', () => ({
	sendSessionSecurityEmail: vi.fn()
}));

const mockedInsertEvent = vi.mocked(insertSessionRevocationEvent);
const mockedRevokeMemberSession = vi.mocked(revokeMemberSession);
const mockedSendEmail = vi.mocked(sendSessionSecurityEmail);

describe('revokeSessionWithAudit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('revokes in Clerk, marks D1, and writes an audit event', async () => {
		const revokeSession = vi.fn().mockResolvedValue(undefined);
		const clerkClient = { sessions: { revokeSession } } as unknown as ClerkClient;

		await revokeSessionWithAudit({
			db: {} as D1Compat,
			clerkClient,
			memberId: 'user_123',
			sessionId: 'sess_old',
			reason: 'member_revoked',
			actor: 'user_123',
			deviceLabel: 'iPhone',
			ipAddress: '203.0.113.10'
		});

		expect(revokeSession).toHaveBeenCalledWith('sess_old');
		expect(mockedRevokeMemberSession).toHaveBeenCalledWith(
			expect.anything(),
			'user_123',
			'sess_old',
			'member_revoked'
		);
		expect(mockedInsertEvent).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				memberId: 'user_123',
				sessionId: 'sess_old',
				reason: 'member_revoked',
				actor: 'user_123',
				deviceLabel: 'iPhone',
				ipAddress: '203.0.113.10'
			})
		);
		expect(mockedSendEmail).not.toHaveBeenCalled();
	});

	it('still records revocation when Clerk revoke fails', async () => {
		const revokeSession = vi.fn().mockRejectedValue(new Error('session_not_found'));
		const clerkClient = { sessions: { revokeSession } } as unknown as ClerkClient;

		await revokeSessionWithAudit({
			db: {} as D1Compat,
			clerkClient,
			memberId: 'user_123',
			sessionId: 'sess_gone',
			reason: 'device_limit_exceeded',
			actor: 'system'
		});

		expect(mockedRevokeMemberSession).toHaveBeenCalled();
		expect(mockedInsertEvent).toHaveBeenCalled();
	});

	it('sends a security email when device-limit auto-revoke notifies the member', async () => {
		const revokeSession = vi.fn().mockResolvedValue(undefined);
		const clerkClient = { sessions: { revokeSession } } as unknown as ClerkClient;

		await revokeSessionWithAudit({
			db: {} as D1Compat,
			clerkClient,
			memberId: 'user_123',
			sessionId: 'sess_old',
			reason: 'device_limit_exceeded',
			actor: 'system',
			runtimeEnv: { RESEND_API_KEY: 're_test' },
			notifyMember: {
				email: 'member@example.com',
				name: 'Member',
				revokedDeviceLabel: 'iPhone',
				currentDeviceLabel: 'Mac'
			}
		});

		expect(mockedSendEmail).toHaveBeenCalledWith(
			{ RESEND_API_KEY: 're_test' },
			expect.objectContaining({
				email: 'member@example.com',
				revokedDeviceLabel: 'iPhone',
				currentDeviceLabel: 'Mac'
			})
		);
	});
});
