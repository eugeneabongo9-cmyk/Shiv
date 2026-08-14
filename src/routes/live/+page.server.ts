import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getRsvpForMember, listEvents } from '$lib/server/db/shivworks';
import { requireEntitled } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireEntitled(locals, '/live');
	const db = getDBFromPlatform(platform);

	return {
		user,
		events: await listEvents(db, user),
		rsvps: await getRsvpForMember(db, user.clerkUserId)
	};
};
