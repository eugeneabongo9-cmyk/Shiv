import { describe, expect, it } from 'vitest';
import { filterLessons, lessonStatusLabel } from '$lib/admin/lesson-display';
import type { AdminLessonRecord } from '$lib/server/db/shivworks';

const lesson = (overrides: Partial<AdminLessonRecord> = {}): AdminLessonRecord => ({
	id: 'module_1',
	courseId: 'course_1',
	title: 'Lesson',
	description: null,
	sortOrder: 1,
	status: 'coming_soon',
	videoKind: 'none',
	videoUrl: null,
	durationLabel: null,
	thumbnailUrl: null,
	publishedAt: null,
	accessTier: 'member',
	courseSlug: 'course',
	courseTitle: 'Course',
	courseAccessTier: 'member',
	primaryEpisode: null,
	...overrides
});

describe('lesson display helpers', () => {
	it('labels statuses for the admin UI', () => {
		expect(lessonStatusLabel('available')).toBe('Published');
		expect(lessonStatusLabel('coming_soon')).toBe('Draft');
	});

	it('filters lessons by publish state and course', () => {
		const lessons = [
			lesson({ id: 'a', status: 'available', courseId: 'course_a' }),
			lesson({ id: 'b', status: 'coming_soon', courseId: 'course_b' })
		];

		expect(filterLessons(lessons, 'published', '').map((item) => item.id)).toEqual(['a']);
		expect(filterLessons(lessons, 'all', 'course_b').map((item) => item.id)).toEqual(['b']);
	});
});
