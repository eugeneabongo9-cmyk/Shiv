import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { buildCourseReleaseCounts } from '$lib/library/catalog';
import { listCourses, listEvents, listRecentUpdates } from '$lib/server/db/shivworks';
import { requireEntitled } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireEntitled(locals, '/updates');
	const db = getDBFromPlatform(platform);
	const [updates, courses, events] = await Promise.all([
		listRecentUpdates(db, user, 50),
		listCourses(db, user),
		listEvents(db, user)
	]);

	const sortedEvents = [...events].sort((left, right) => {
		const statusWeight = (status: string) =>
			status === 'live' ? 0 : status === 'scheduled' ? 1 : 2;
		const statusDelta = statusWeight(left.status) - statusWeight(right.status);
		if (statusDelta !== 0) {
			return statusDelta;
		}

		const leftTime = left.startsAt ?? Number.MAX_SAFE_INTEGER;
		const rightTime = right.startsAt ?? Number.MAX_SAFE_INTEGER;

		if (left.status === 'ended' && right.status === 'ended') {
			return rightTime - leftTime;
		}

		return leftTime - rightTime;
	});

	return {
		user,
		updates,
		courseCounts: buildCourseReleaseCounts(courses),
		eventCounts: {
			total: events.length,
			live: events.filter((event) => event.status === 'live').length,
			scheduled: events.filter((event) => event.status === 'scheduled').length
		},
		nextEvent: sortedEvents[0] ?? null
	};
};
