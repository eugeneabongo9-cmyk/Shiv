import type { PageServerLoad } from './$types';
import { MEMBER_ACTIVE_SESSION_LIMIT } from '$lib/constants/session-policy';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { listActiveMemberSessions } from '$lib/server/db/shivworks';
import { requireAuthenticated } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireAuthenticated(locals, '/settings/sessions');
	const db = getDBFromPlatform(platform);

	return {
		user,
		sessions: await listActiveMemberSessions(db, user.clerkUserId),
		currentSessionId: locals.auth.sessionId,
		sessionLimit: MEMBER_ACTIVE_SESSION_LIMIT
	};
};
