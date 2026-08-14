import { describe, expect, it } from 'vitest';
import type { CourseRecord } from '$lib/server/db/shivworks';
import { sortCoursesForDisplay } from './course-order';

function course(id: string, status: CourseRecord['status'] = 'coming_soon'): CourseRecord {
	return {
		id,
		slug: id,
		title: id,
		description: '',
		status,
		sortOrder: 99,
		badgeText: null,
		artworkUrl: null,
		courseKind: 'course',
		accessTier: 'member',
		totalModuleCount: 0,
		availableModuleCount: 0,
		roadmapModuleCount: 0,
		completedModuleCount: 0,
		startedModuleCount: 0
	};
}

describe('sortCoursesForDisplay', () => {
	it('follows landing curriculum order regardless of availability status', () => {
		const sorted = sortCoursesForDisplay([
			course('course_products'),
			course('course_muc', 'available'),
			course('course_pcc'),
			course('course_cap', 'available'),
			course('course_foundations', 'available'),
			course('course_core_skills')
		]);

		expect(sorted.map((item) => item.id)).toEqual([
			'course_foundations',
			'course_cap',
			'course_muc',
			'course_core_skills',
			'course_pcc',
			'course_products'
		]);
	});
});
