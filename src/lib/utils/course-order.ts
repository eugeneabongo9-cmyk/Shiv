import { getCurriculumSortIndex } from '$lib/constants/curriculum';
import type { CourseRecord } from '$lib/server/db/shivworks';

/** Curriculum release order — matches the landing page, not availability status. */
export function sortCoursesForDisplay(courses: CourseRecord[]): CourseRecord[] {
	return [...courses].sort((left, right) => {
		const byCurriculum = getCurriculumSortIndex(left.id) - getCurriculumSortIndex(right.id);
		if (byCurriculum !== 0) {
			return byCurriculum;
		}

		const bySortOrder = left.sortOrder - right.sortOrder;
		if (bySortOrder !== 0) {
			return bySortOrder;
		}

		return left.title.localeCompare(right.title);
	});
}
