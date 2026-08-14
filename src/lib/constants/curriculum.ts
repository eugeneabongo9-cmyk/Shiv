/** First three curriculum blocks confirmed playable at launch (see LANDING_CURRICULUM). */
export const LAUNCH_READY_COURSE_IDS = ['course_foundations', 'course_cap', 'course_muc'] as const;

const launchReadyCourseIds = new Set<string>(LAUNCH_READY_COURSE_IDS);

export function isLaunchReadyCourse(courseId: string): boolean {
	return launchReadyCourseIds.has(courseId);
}

/** Library course order — mirrors LANDING_CURRICULUM release sequence. */
export const LIBRARY_COURSE_ORDER = [
	'course_foundations',
	'course_cap',
	'course_muc',
	'course_core_skills',
	'course_pcc',
	'course_wrestling',
	'course_ifwa',
	'course_entangled_live_fire',
	'course_edged',
	'course_grounded',
	'course_retention',
	'course_products'
] as const;

const courseOrderIndex = new Map<string, number>(
	LIBRARY_COURSE_ORDER.map((courseId, index) => [courseId, index])
);

export function getCurriculumSortIndex(courseId: string): number {
	return courseOrderIndex.get(courseId) ?? LIBRARY_COURSE_ORDER.length;
}
