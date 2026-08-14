import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	getGamificationForMember,
	getLatestModuleProgressForMember,
	getMemberProfile,
	getRsvpForMember,
	listCourses,
	listEvents,
	listRecentUpdates
} from '$lib/server/db/shivworks';
import { buildDashboardActivitySnapshot, pickNextEvent } from '$lib/server/dashboard';
import { buildCourseReleaseCounts } from '$lib/library/catalog';
import { requireEntitled } from '$lib/server/guards';
import { buildWelcomeExperience } from '$lib/server/upcoming-content';
import { sortCoursesForDisplay } from '$lib/utils/course-order';
import { getOrSet } from '$lib/server/kv-cache';
import { _isProfileComplete as isProfileComplete } from '../account/[...rest]/+page.server';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireEntitled(locals, '/dashboard');
	const db = getDBFromPlatform(platform);
	const kv = platform?.env?.KV;

	const [updates, courses, events, resumeItem, gamification, profile, rsvpByEventId] =
		await Promise.all([
			listRecentUpdates(db, user, 4),
			listCourses(db, user),
			listEvents(db, user),
			getOrSet(kv, `progress:${user.clerkUserId}`, 60, () =>
				getLatestModuleProgressForMember(db, user)
			),
			getOrSet(kv, `gamification:${user.clerkUserId}`, 120, () =>
				getGamificationForMember(db, user.clerkUserId)
			),
			getMemberProfile(db, user.clerkUserId),
			getRsvpForMember(db, user.clerkUserId)
		]);

	const sortedCourses = sortCoursesForDisplay(courses);
	const experience = buildWelcomeExperience({ tier: user.tier, courses, events });
	const nextEvent = pickNextEvent(events);
	const activity = buildDashboardActivitySnapshot({
		resumeItem,
		gamification,
		updates,
		events,
		rsvpByEventId
	});

	const courseCounts = buildCourseReleaseCounts(courses);

	return {
		user,
		experience,
		nextEvent,
		activity,
		profileComplete: isProfileComplete(profile),
		updates,
		courses: sortedCourses.slice(0, 4),
		courseCounts
	};
};
