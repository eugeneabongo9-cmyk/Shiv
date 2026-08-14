import type { LayoutServerLoad } from './$types';
import { upcomingLaneForRoute } from '$lib/constants/upcoming-content';
import { resolveRuntimeEnv } from '$lib/server/env';
import { isLaunchGated } from '$lib/server/launch-gating';
import { buildUpcomingTracker } from '$lib/server/upcoming-content';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getGamificationForMember, listCourses } from '$lib/server/db/shivworks';

export const load: LayoutServerLoad = async ({ locals, url, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);

	// v2-1.3 launch gating: 11 routes show ComingSoon instead of their
	// real page content for non-admin viewers. Admins bypass for preview.
	const gated = isLaunchGated(url.pathname, locals.user);
	const upcomingLane = gated ? (gated.upcomingLane ?? upcomingLaneForRoute(url.pathname)) : null;
	const upcomingTracker = upcomingLane
		? buildUpcomingTracker({ tier: locals.user?.tier ?? 'free', lane: upcomingLane })
		: null;

	let shell = null as {
		modulesStarted: number;
		modulesTotal: number;
		rank: string | null;
	} | null;

	if (locals.user?.accessStatus === 'active') {
		try {
			const db = getDBFromPlatform(platform);
			const [courses, gamification] = await Promise.all([
				listCourses(db, locals.user),
				getGamificationForMember(db, locals.user.clerkUserId)
			]);
			shell = {
				modulesStarted: courses.reduce((sum, course) => sum + course.startedModuleCount, 0),
				modulesTotal: courses.reduce((sum, course) => sum + course.totalModuleCount, 0),
				rank: gamification.rank
			};
		} catch {
			shell = { modulesStarted: 0, modulesTotal: 0, rank: null };
		}
	}

	return {
		auth: locals.auth,
		user: locals.user,
		publicConfig: {
			clerkPublishableKey: runtimeEnv.PUBLIC_CLERK_PUBLISHABLE_KEY || null
		},
		gated,
		upcomingTracker,
		shell
	};
};
