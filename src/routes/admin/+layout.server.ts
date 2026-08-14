import type { LayoutServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getAdminSummaryCounts } from '$lib/server/db/shivworks';
import { requireAdmin } from '$lib/server/guards';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	requireAdmin(locals);
	const db = getDBFromPlatform(platform);

	return {
		adminSummary: await getAdminSummaryCounts(db)
	};
};
