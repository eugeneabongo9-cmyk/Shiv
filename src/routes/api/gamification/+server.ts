import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getGamificationForMember } from '$lib/server/db/shivworks';
import { requireEntitled } from '$lib/server/guards';

export const GET: RequestHandler = async ({ locals, platform }) => {
	const user = requireEntitled(locals, '/dashboard');
	const db = getDBFromPlatform(platform);
	const gamification = await getGamificationForMember(db, user.clerkUserId);

	return json({ success: true, data: gamification });
};
