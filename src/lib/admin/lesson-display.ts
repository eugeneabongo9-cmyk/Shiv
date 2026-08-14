import type { AdminLessonRecord } from '$lib/server/db/shivworks';

export type LessonFilter = 'all' | 'published' | 'draft' | 'archived';

export function lessonStatusLabel(status: AdminLessonRecord['status']): string {
	switch (status) {
		case 'available':
			return 'Published';
		case 'archived':
			return 'Archived';
		default:
			return 'Draft';
	}
}

export function lessonStatusPillClass(status: AdminLessonRecord['status']): string {
	switch (status) {
		case 'available':
			return 'st-pill ready';
		case 'archived':
			return 'st-pill';
		default:
			return 'st-pill scheduled';
	}
}

export function lessonStreamSummary(lesson: AdminLessonRecord): string {
	const media = lesson.primaryEpisode?.media;
	if (!media?.providerAssetId) {
		return 'No video';
	}

	const state = media.ingestStatus.replaceAll('_', ' ');
	return `${state} · ${media.providerAssetId.slice(0, 8)}…`;
}

export function filterLessons(
	lessons: AdminLessonRecord[],
	filter: LessonFilter,
	courseId: string
): AdminLessonRecord[] {
	return lessons.filter((lesson) => {
		if (courseId && lesson.courseId !== courseId) {
			return false;
		}

		switch (filter) {
			case 'published':
				return lesson.status === 'available';
			case 'draft':
				return lesson.status === 'coming_soon';
			case 'archived':
				return lesson.status === 'archived';
			default:
				return true;
		}
	});
}

export function toDateTimeLocal(value: number | null): string {
	if (!value) {
		return '';
	}

	const date = new Date(value);
	return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function formatPublishedAt(value: number | null): string {
	if (!value) {
		return 'Not set';
	}

	return new Date(value).toLocaleString();
}
