import { describe, expect, it, vi, beforeEach } from 'vitest';
import { enforceSessionSecurity } from './session-security';
import { getMemberSession, listActiveMemberSessions, upsertMemberSession } from './db/shivworks';
import { revokeSessionWithAudit } from './session-revocation';
import type { ClerkClient } from '@clerk/backend';
import type { D1Compat } from './d1-compat';
import type { MemberRecord } from './db/shivworks';

vi.mock('./db/shivworks', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./db/shivworks')>();

	return {
		...actual,
		getMemberSession: vi.fn(),
		listActiveMemberSessions: vi.fn(),
		upsertMemberSession: vi.fn()
	};
});

vi.mock('./session-revocation', () => ({
	revokeSessionWithAudit: vi.fn()
}));

const mockedGetMemberSession = vi.mocked(getMemberSession);
const mockedListActiveMemberSessions = vi.mocked(listActiveMemberSessions);
const mockedUpsertMemberSession = vi.mocked(upsertMemberSession);
const mockedRevokeSessionWithAudit = vi.mocked(revokeSessionWithAudit);

const member = {
	clerkUserId: 'user_123',
	email: 'member@example.com',
	name: 'Member Example',
	tier: 'bronze',
	accessStatus: 'active',
	role: 'member',
	createdAt: '2026-06-10T00:00:00.000Z',
	updatedAt: '2026-06-10T00:00:00.000Z'
} satisfies MemberRecord;

const clerkClient = {
	sessions: {
		revokeSession: vi.fn()
	}
} as unknown as ClerkClient;

const request = new Request('https://theshivworksnetwork.com/dashboard', {
	headers: {
		'cf-connecting-ip': '203.0.113.10',
		'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
	}
});

const baseInput = {
	db: {} as D1Compat,
	clerkClient,
	member,
	sessionId: 'sess_current',
	request,
	runtimeEnv: {}
};

describe('enforceSessionSecurity', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('blocks access when the current session is revoked in D1', async () => {
		mockedGetMemberSession.mockResolvedValueOnce({
			sessionId: 'sess_current',
			memberId: member.clerkUserId,
			deviceLabel: 'Mac',
			ipAddress: '203.0.113.10',
			userAgent: 'Mozilla/5.0',
			createdAt: 1,
			lastActiveAt: 4,
			revokedAt: 99,
			revokeReason: 'member_revoked'
		});

		const outcome = await enforceSessionSecurity(baseInput);

		expect(outcome).toEqual({ status: 'revoked', reason: 'member_revoked' });
		expect(mockedUpsertMemberSession).not.toHaveBeenCalled();
		expect(mockedRevokeSessionWithAudit).not.toHaveBeenCalled();
	});

	it('tracks an existing session without revoking other devices during navigation', async () => {
		const activeSessions = [
			{
				sessionId: 'sess_current',
				memberId: member.clerkUserId,
				deviceLabel: 'Mac',
				ipAddress: '203.0.113.10',
				userAgent: 'Mozilla/5.0',
				createdAt: 1,
				lastActiveAt: 4,
				revokedAt: null,
				revokeReason: null
			},
			{
				sessionId: 'sess_old_1',
				memberId: member.clerkUserId,
				deviceLabel: 'iPhone',
				ipAddress: '203.0.113.11',
				userAgent: 'Mozilla/5.0 (iPhone)',
				createdAt: 1,
				lastActiveAt: 2,
				revokedAt: null,
				revokeReason: null
			}
		];

		mockedGetMemberSession.mockResolvedValueOnce(activeSessions[0]);
		mockedListActiveMemberSessions.mockResolvedValueOnce(activeSessions);

		const outcome = await enforceSessionSecurity(baseInput);

		expect(outcome).toEqual({
			status: 'allowed',
			sessions: activeSessions,
			enrolledNewDevice: false
		});
		expect(mockedUpsertMemberSession).toHaveBeenCalled();
		expect(mockedRevokeSessionWithAudit).not.toHaveBeenCalled();
	});

	it('revokes the oldest non-current session when a new device exceeds the limit', async () => {
		mockedGetMemberSession.mockResolvedValueOnce(null);
		mockedListActiveMemberSessions
			.mockResolvedValueOnce([
				{
					sessionId: 'sess_current',
					memberId: member.clerkUserId,
					deviceLabel: 'Mac',
					ipAddress: '203.0.113.10',
					userAgent: 'Mozilla/5.0',
					createdAt: 10,
					lastActiveAt: 10,
					revokedAt: null,
					revokeReason: null
				},
				{
					sessionId: 'sess_old_1',
					memberId: member.clerkUserId,
					deviceLabel: 'iPhone',
					ipAddress: '203.0.113.11',
					userAgent: 'Mozilla/5.0 (iPhone)',
					createdAt: 1,
					lastActiveAt: 2,
					revokedAt: null,
					revokeReason: null
				},
				{
					sessionId: 'sess_old_2',
					memberId: member.clerkUserId,
					deviceLabel: 'Windows PC',
					ipAddress: '203.0.113.12',
					userAgent: 'Mozilla/5.0 (Windows)',
					createdAt: 1,
					lastActiveAt: 3,
					revokedAt: null,
					revokeReason: null
				}
			])
			.mockResolvedValueOnce([
				{
					sessionId: 'sess_current',
					memberId: member.clerkUserId,
					deviceLabel: 'Mac',
					ipAddress: '203.0.113.10',
					userAgent: 'Mozilla/5.0',
					createdAt: 10,
					lastActiveAt: 10,
					revokedAt: null,
					revokeReason: null
				},
				{
					sessionId: 'sess_old_2',
					memberId: member.clerkUserId,
					deviceLabel: 'Windows PC',
					ipAddress: '203.0.113.12',
					userAgent: 'Mozilla/5.0 (Windows)',
					createdAt: 1,
					lastActiveAt: 3,
					revokedAt: null,
					revokeReason: null
				}
			]);

		const outcome = await enforceSessionSecurity(baseInput);

		expect(outcome.status).toBe('allowed');
		expect(outcome).toMatchObject({ enrolledNewDevice: true });
		expect(mockedRevokeSessionWithAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				memberId: member.clerkUserId,
				sessionId: 'sess_old_1',
				reason: 'device_limit_exceeded',
				actor: 'system'
			})
		);
	});
});
