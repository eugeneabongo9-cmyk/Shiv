import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClerkClient } from '$lib/server/clerk';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getMemberSession, listActiveMemberSessions } from '$lib/server/db/shivworks';
import { resolveRuntimeEnv } from '$lib/server/env';
import { SessionRevokeParamsSchema } from '$lib/server/schemas';
import { revokeSessionWithAudit } from '$lib/server/session-revocation';

export const POST: RequestHandler = async ({ params, locals, platform, request }) => {
	if (!locals.user || !locals.auth.isAuthenticated || !locals.auth.sessionId) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const paramsResult = SessionRevokeParamsSchema.safeParse(params);
	if (!paramsResult.success) {
		return json({ success: false, error: 'Invalid session ID' }, { status: 400 });
	}

	const targetSessionId = paramsResult.data.sessionId;
	if (targetSessionId === locals.auth.sessionId) {
		return json(
			{ success: false, error: 'Cannot revoke your current session here' },
			{ status: 400 }
		);
	}

	const db = getDBFromPlatform(platform);
	const target = await getMemberSession(db, locals.user.clerkUserId, targetSessionId);

	if (!target || target.revokedAt) {
		return json({ success: false, error: 'Session not found' }, { status: 404 });
	}

	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	const clerkClient = getClerkClient(runtimeEnv);
	const currentSession = await getMemberSession(db, locals.user.clerkUserId, locals.auth.sessionId);
	const ipAddress =
		request.headers.get('cf-connecting-ip') ||
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		null;

	try {
		await revokeSessionWithAudit({
			db,
			clerkClient,
			memberId: locals.user.clerkUserId,
			sessionId: targetSessionId,
			reason: 'member_revoked',
			actor: locals.user.clerkUserId,
			deviceLabel: target.deviceLabel,
			ipAddress
		});
	} catch (error) {
		console.error('Manual session revoke failed', error);
		return json({ success: false, error: 'Unable to revoke session' }, { status: 500 });
	}

	const sessions = await listActiveMemberSessions(db, locals.user.clerkUserId);
	return json({
		success: true,
		sessions,
		revokedDeviceLabel: target.deviceLabel,
		currentDeviceLabel: currentSession?.deviceLabel ?? 'This device'
	});
};
