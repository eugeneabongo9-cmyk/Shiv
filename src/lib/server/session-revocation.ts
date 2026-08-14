import type { ClerkClient } from '@clerk/backend';
import { sendSessionSecurityEmail } from '$lib/email';
import type { SessionRevokeReason } from '$lib/constants/session-policy';
import type { D1Compat } from '$lib/server/d1-compat';
import { insertSessionRevocationEvent } from '$lib/server/db/session-revocation';
import { revokeMemberSession } from '$lib/server/db/shivworks';

export type RevokeSessionWithAuditInput = {
	db: D1Compat;
	clerkClient: ClerkClient;
	memberId: string;
	sessionId: string;
	reason: SessionRevokeReason;
	actor: string;
	deviceLabel?: string | null;
	ipAddress?: string | null;
	runtimeEnv?: Record<string, string | undefined>;
	notifyMember?: {
		email: string;
		name: string;
		revokedDeviceLabel: string;
		currentDeviceLabel: string;
	};
};

export async function revokeSessionWithAudit(input: RevokeSessionWithAuditInput): Promise<void> {
	const {
		db,
		clerkClient,
		memberId,
		sessionId,
		reason,
		actor,
		deviceLabel,
		ipAddress,
		runtimeEnv,
		notifyMember
	} = input;

	let clerkRevoked = false;
	try {
		await clerkClient.sessions.revokeSession(sessionId);
		clerkRevoked = true;
	} catch (error) {
		console.warn('session_revocation_clerk_failed', {
			memberId,
			sessionId,
			reason,
			error: error instanceof Error ? error.message : String(error)
		});
	}

	await revokeMemberSession(db, memberId, sessionId, reason);

	await insertSessionRevocationEvent(db, {
		id: crypto.randomUUID(),
		memberId,
		sessionId,
		reason,
		actor,
		deviceLabel,
		ipAddress
	});

	console.info('session_revoked', {
		memberId,
		sessionId,
		reason,
		actor,
		clerkRevoked
	});

	if (notifyMember && runtimeEnv) {
		try {
			await sendSessionSecurityEmail(runtimeEnv, notifyMember);
		} catch (error) {
			console.error('session_revocation_email_failed', {
				memberId,
				sessionId,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
}
