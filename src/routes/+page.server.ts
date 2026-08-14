import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { logError } from '$lib/server/log';
import { getFoundingMemberTrackerCounts } from '$lib/server/member-counts';

export const load: PageServerLoad = async ({ locals, platform, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=300' });

	let memberCounts = { bronze: 0, vip: 0, total: 0 };

	try {
		const db = getDBFromPlatform(platform);
		memberCounts = await getFoundingMemberTrackerCounts(db);
	} catch (error) {
		logError('landing.memberCounts', error);
	}

	return {
		user: locals.user,
		memberCounts
	};
};
