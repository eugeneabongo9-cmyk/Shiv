import type { ClerkClient } from '@clerk/backend';
import { MEMBER_ACTIVE_SESSION_LIMIT } from '$lib/constants/session-policy';
import type { D1Compat } from '$lib/server/d1-compat';
import type { MemberRecord, MemberSessionRecord } from '$lib/server/db/shivworks';
import {
	getMemberSession,
	listActiveMemberSessions,
	upsertMemberSession
} from '$lib/server/db/shivworks';
import { revokeSessionWithAudit } from '$lib/server/session-revocation';

function deriveDeviceLabel(userAgent: string | null): string {
	if (!userAgent) return 'Unknown device';

	if (/iphone/i.test(userAgent)) return 'iPhone';
	if (/ipad/i.test(userAgent)) return 'iPad';
	if (/android/i.test(userAgent)) return 'Android device';
	if (/macintosh|mac os/i.test(userAgent)) return 'Mac';
	if (/windows/i.test(userAgent)) return 'Windows PC';
	if (/smart-tv|tv/i.test(userAgent)) return 'Smart TV';

	return 'Browser device';
}

function getClientIp(request: Request): string | null {
	const forwarded =
		request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
	return forwarded?.split(',')[0]?.trim() || null;
}

export type SessionSecurityOutcome =
	| {
			status: 'allowed';
			sessions: MemberSessionRecord[];
			enrolledNewDevice: boolean;
	  }
	| {
			status: 'revoked';
			reason: string;
	  };

async function enforceDeviceLimitOnEnrollment(input: {
	db: D1Compat;
	clerkClient: ClerkClient;
	member: MemberRecord;
	currentSessionId: string;
	currentDeviceLabel: string;
	runtimeEnv: Record<string, string | undefined>;
}): Promise<void> {
	const { db, clerkClient, member, currentSessionId, currentDeviceLabel, runtimeEnv } = input;
	const active = await listActiveMemberSessions(db, member.clerkUserId);

	if (active.length <= MEMBER_ACTIVE_SESSION_LIMIT) {
		return;
	}

	const excessCount = active.length - MEMBER_ACTIVE_SESSION_LIMIT;
	const victims = active
		.filter((session) => session.sessionId !== currentSessionId)
		.sort((a, b) => a.lastActiveAt - b.lastActiveAt)
		.slice(0, excessCount);

	for (const session of victims) {
		await revokeSessionWithAudit({
			db,
			clerkClient,
			memberId: member.clerkUserId,
			sessionId: session.sessionId,
			reason: 'device_limit_exceeded',
			actor: 'system',
			deviceLabel: session.deviceLabel,
			ipAddress: session.ipAddress,
			runtimeEnv,
			notifyMember: {
				email: member.email,
				name: member.name,
				revokedDeviceLabel: session.deviceLabel,
				currentDeviceLabel
			}
		});
	}
}

export async function enforceSessionSecurity(input: {
	db: D1Compat;
	clerkClient: ClerkClient;
	member: MemberRecord;
	sessionId: string;
	request: Request;
	runtimeEnv: Record<string, string | undefined>;
}): Promise<SessionSecurityOutcome> {
	const { db, clerkClient, member, sessionId, request, runtimeEnv } = input;
	const ipAddress = getClientIp(request);
	const userAgent = request.headers.get('user-agent');
	const deviceLabel = deriveDeviceLabel(userAgent);

	const existing = await getMemberSession(db, member.clerkUserId, sessionId);
	if (existing?.revokedAt) {
		console.info('session_access_blocked', {
			memberId: member.clerkUserId,
			sessionId,
			reason: existing.revokeReason ?? 'revoked'
		});
		return {
			status: 'revoked',
			reason: existing.revokeReason ?? 'revoked'
		};
	}

	const isNewEnrollment = !existing;

	await upsertMemberSession(db, {
		memberId: member.clerkUserId,
		sessionId,
		deviceLabel,
		ipAddress,
		userAgent
	});

	if (isNewEnrollment) {
		await enforceDeviceLimitOnEnrollment({
			db,
			clerkClient,
			member,
			currentSessionId: sessionId,
			currentDeviceLabel: deviceLabel,
			runtimeEnv
		});
	}

	const sessions = await listActiveMemberSessions(db, member.clerkUserId);
	return {
		status: 'allowed',
		sessions,
		enrolledNewDevice: isNewEnrollment
	};
}

/** @deprecated Use enforceSessionSecurity. Kept for transitional imports. */
export async function syncAndEnforceSessionLimit(input: {
	db: D1Compat;
	clerkClient: ClerkClient;
	member: MemberRecord;
	sessionId: string;
	request: Request;
	runtimeEnv: Record<string, string | undefined>;
}): Promise<MemberSessionRecord[]> {
	const outcome = await enforceSessionSecurity(input);
	if (outcome.status === 'revoked') {
		return [];
	}
	return outcome.sessions;
}
