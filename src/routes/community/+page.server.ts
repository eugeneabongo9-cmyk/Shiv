import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { buildCourseReleaseCounts } from '$lib/library/catalog';
import { listCourses, listEvents, listRecentUpdates } from '$lib/server/db/shivworks';
import { requirePaidMember } from '$lib/server/guards';
import { resolveRuntimeEnv } from '$lib/server/env';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requirePaidMember(locals, '/community');
	const db = getDBFromPlatform(platform);
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	const [courses, events, updates] = await Promise.all([
		listCourses(db, user),
		listEvents(db, user),
		listRecentUpdates(db, user, 4)
	]);

	return {
		user,
		circleUrl: runtimeEnv.PUBLIC_CIRCLE_COMMUNITY_URL || '',
		courses,
		courseCounts: buildCourseReleaseCounts(courses),
		events,
		updates
	};
};
