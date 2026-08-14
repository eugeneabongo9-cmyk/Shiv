import { canAccessAudience, type ContentAudience } from '$lib/constants/tiers';
import { isLaunchReadyCourse } from '$lib/constants/curriculum';
import type { CourseRecord, MemberRecord } from '$lib/server/db/shivworks';

export type LibraryCatalogFilter = 'all' | 'available' | 'coming_soon' | 'free' | 'bronze' | 'vip';

export type CourseProgressBadge = 'not-started' | 'in-progress' | 'completed';

export const LIBRARY_FILTER_LABELS: Record<LibraryCatalogFilter, string> = {
	all: 'All',
	available: 'Available Now',
	coming_soon: 'Coming Soon',
	free: 'Preview',
	bronze: 'Bronze',
	vip: 'VIP'
};

export const PROGRESS_BADGE_LABELS: Record<CourseProgressBadge, string> = {
	'not-started': 'Not Started',
	'in-progress': 'In Progress',
	completed: 'Completed'
};

export function mergeCatalogCourses(
	allCourses: CourseRecord[],
	memberCourses: CourseRecord[]
): CourseRecord[] {
	const progressById = new Map(memberCourses.map((course) => [course.id, course]));

	return allCourses.map((course) => {
		const withProgress = progressById.get(course.id);
		if (withProgress) {
			return withProgress;
		}

		return {
			...course,
			completedModuleCount: 0,
			startedModuleCount: 0
		};
	});
}

export function isCourseAccessible(member: MemberRecord, course: CourseRecord): boolean {
	return canAccessAudience(member, course.accessTier);
}

export function shouldShowUpgradeCta(member: MemberRecord, accessTier: ContentAudience): boolean {
	if (member.role === 'admin' || canAccessAudience(member, accessTier)) {
		return false;
	}

	return member.tier === 'free';
}

export function getCourseLockCopy(accessTier: ContentAudience): string {
	switch (accessTier) {
		case 'free':
			return 'This preview opens to all members once it goes live.';
		case 'member':
		case 'vip':
			return 'Full curriculum access unlocks with a Bronze or VIP founding membership.';
		default:
			return 'Become a founding member to unlock the full ShivWorks curriculum.';
	}
}

export function getCourseProgressBadge(course: CourseRecord): CourseProgressBadge {
	if (
		course.completedModuleCount > 0 &&
		course.availableModuleCount > 0 &&
		course.completedModuleCount >= course.availableModuleCount
	) {
		return 'completed';
	}

	if (course.startedModuleCount > 0) {
		return 'in-progress';
	}

	return 'not-started';
}

export function getCourseProgressDetail(course: CourseRecord): string {
	if (course.status !== 'available') {
		return 'Opens with the next curriculum release';
	}

	const badge = getCourseProgressBadge(course);

	if (badge === 'completed' && course.availableModuleCount > 0) {
		const percent = Math.round((course.completedModuleCount / course.availableModuleCount) * 100);
		return `Completed ${course.completedModuleCount}/${course.availableModuleCount} modules (${percent}%)`;
	}

	if (badge === 'in-progress' && course.availableModuleCount > 0) {
		const percent = Math.round((course.completedModuleCount / course.availableModuleCount) * 100);
		return `${course.startedModuleCount} started · ${course.completedModuleCount} completed (${percent}%)`;
	}

	if (course.availableModuleCount > 0) {
		return `${course.availableModuleCount} module${course.availableModuleCount === 1 ? '' : 's'} ready when you open it`;
	}

	return 'Opens with the next curriculum release';
}

export function courseMatchesCatalogFilter(
	course: CourseRecord,
	filter: LibraryCatalogFilter
): boolean {
	switch (filter) {
		case 'all':
			return true;
		case 'available':
			return course.status === 'available';
		case 'coming_soon':
			return course.status === 'coming_soon';
		case 'free':
			return course.accessTier === 'free';
		case 'bronze':
			return course.accessTier === 'member';
		case 'vip':
			return course.accessTier === 'vip';
		default:
			return true;
	}
}

export function courseMatchesSearch(course: CourseRecord, query: string): boolean {
	const normalized = query.trim().toLowerCase();
	if (!normalized) {
		return true;
	}

	const haystack = [course.title, course.description, course.badgeText ?? '', course.slug]
		.join(' ')
		.toLowerCase();
	const terms = normalized.split(/\s+/).filter(Boolean);

	return terms.every((term) => haystack.includes(term));
}

export function filterCatalogCourses(
	courses: CourseRecord[],
	options: { query: string; filter: LibraryCatalogFilter }
): CourseRecord[] {
	return courses.filter(
		(course) =>
			courseMatchesCatalogFilter(course, options.filter) &&
			courseMatchesSearch(course, options.query)
	);
}

export function getCatalogFilterStatusCopy(filter: LibraryCatalogFilter): string {
	switch (filter) {
		case 'available':
			return 'Showing courses that are live in the library right now.';
		case 'coming_soon':
			return 'Showing roadmap courses that are staged but not yet available.';
		case 'free':
			return 'Showing preview curriculum blocks.';
		case 'bronze':
			return 'Showing Bronze-tagged curriculum blocks.';
		case 'vip':
			return 'Showing VIP-tagged curriculum blocks.';
		default:
			return 'Showing the full visible curriculum catalog.';
	}
}

export function buildCatalogSummaryCounts(
	courses: CourseRecord[],
	member: MemberRecord
): {
	showing: number;
	availableNow: number;
	membershipRequired: number;
} {
	const accessible = courses.filter((course) => isCourseAccessible(member, course));

	return {
		showing: courses.length,
		availableNow: accessible.filter((course) => course.status === 'available').length,
		membershipRequired: courses.length - accessible.length
	};
}

export function getCatalogEmptyTitle(options: {
	hasCourses: boolean;
	hasAccessibleCourses: boolean;
	hasFilteredResults: boolean;
	filter: LibraryCatalogFilter;
	query: string;
	lane?: 'training' | 'roadshow' | 'spotlights';
}): string {
	if (!options.hasCourses) {
		switch (options.lane) {
			case 'roadshow':
				return 'No Roadshow episodes are published yet.';
			case 'spotlights':
				return 'No Spotlights are published yet.';
			default:
				return 'No courses are published yet.';
		}
	}

	if (!options.hasFilteredResults) {
		if (options.query.trim()) {
			return 'No courses match your search.';
		}

		if (options.filter !== 'all') {
			return 'No courses match this filter.';
		}
	}

	if (!options.hasAccessibleCourses) {
		return 'Your current tier has no unlocked courses yet.';
	}

	return 'No courses to show.';
}

export function getCatalogEmptyBody(options: {
	hasCourses: boolean;
	hasAccessibleCourses: boolean;
	hasFilteredResults: boolean;
	filter: LibraryCatalogFilter;
	query: string;
	memberTier: MemberRecord['tier'];
	lane?: 'training' | 'roadshow' | 'spotlights';
}): string {
	if (!options.hasCourses) {
		switch (options.lane) {
			case 'roadshow':
				return 'Road episodes will land here when the next training-room release is published.';
			case 'spotlights':
				return 'Focused member drops will appear in this lane when Spotlights go live.';
			default:
				return 'Check back after the next curriculum release.';
		}
	}

	if (!options.hasFilteredResults) {
		if (options.query.trim()) {
			return 'Try a different search term or clear filters to see the full catalog.';
		}

		if (options.filter !== 'all') {
			if (options.filter === 'available') {
				return 'Switch to Coming Soon or All to browse staged roadmap blocks.';
			}

			return 'Clear filters or choose All to return to the full catalog.';
		}
	}

	if (!options.hasAccessibleCourses) {
		if (options.memberTier === 'free') {
			return 'The full roadmap stays visible here. Bronze or VIP unlocks paid curriculum blocks.';
		}

		return 'Upgrade your membership to unlock curriculum blocks reserved for your tier.';
	}

	return '';
}

export function memberCanUpgrade(member: MemberRecord): boolean {
	return member.role !== 'admin' && member.tier === 'free';
}

/** Launch-playable curriculum block — Origin Story, CAP, and MUC only. */
export function isCourseReadyForRelease(course: CourseRecord): boolean {
	return (
		isLaunchReadyCourse(course.id) &&
		course.status === 'available' &&
		course.availableModuleCount > 0
	);
}

export function buildCourseReleaseCounts(courses: CourseRecord[]): {
	visible: number;
	available: number;
	roadmap: number;
} {
	const curriculumCourses = courses.filter((course) => course.courseKind === 'course');

	return {
		visible: courses.length,
		available: courses.filter(isCourseReadyForRelease).length,
		roadmap: curriculumCourses.filter((course) => !isCourseReadyForRelease(course)).length
	};
}
