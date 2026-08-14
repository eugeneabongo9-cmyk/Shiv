import type { PageServerLoad } from './$types';
import { mergeCatalogCourses } from '$lib/library/catalog';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getLatestModuleProgressForMember, listCourses } from '$lib/server/db/shivworks';
import { sortCoursesForDisplay } from '$lib/utils/course-order';
import { requireEntitled } from '$lib/server/guards';
import { getOrSet } from '$lib/server/kv-cache';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireEntitled(locals, '/library');
	const db = getDBFromPlatform(platform);
	const kv = platform?.env?.KV;
	const catalogVersion = (await kv?.get('courses:catalog:version')) ?? '0';

	// Cache the shared catalog only. Member progress must stay fresh so
	// completion badges update immediately after a lesson is finished.
	const allCourses = await getOrSet(kv, `courses:catalog:all:${catalogVersion}`, 300, () =>
		listCourses(db, undefined)
	);
	const memberCourses = await listCourses(db, user);
	const courses = sortCoursesForDisplay(mergeCatalogCourses(allCourses, memberCourses));

	// Same query, cache key and TTL the dashboard already uses, so opening the
	// library after the dashboard is a cache hit rather than a second read.
	const resumeItem = await getOrSet(kv, `progress:${user.clerkUserId}`, 60, () =>
		getLatestModuleProgressForMember(db, user)
	);

	return {
		user,
		courses,
		resumeItem
	};
};
