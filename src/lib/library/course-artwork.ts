import { LANDING_CURRICULUM_PLACEHOLDER_SRC } from '$lib/constants/landing';
import type { CourseModuleRecord, CourseRecord } from '$lib/server/db/shivworks';

const LAUNCH_COURSE_POSTERS: Record<string, string> = {
	'shivworks-origin-story': '/landing/trailers/origin-story.jpg',
	'criminal-assault-paradigm': '/landing/trailers/cap.jpg',
	'managing-unknown-contacts': '/landing/trailers/muc.jpg',
	'the-roadshow': '/landing/trailers/roadshow.jpg'
};

const LAUNCH_MODULE_POSTERS: Record<string, string> = {
	module_origin: '/landing/trailers/origin-story.jpg',
	module_cap: '/landing/trailers/cap.jpg',
	module_muc: '/landing/trailers/muc.jpg',
	module_roadshow_episode_1: '/landing/trailers/roadshow.jpg'
};

export interface CourseArtwork {
	posterSrc: string;
	comingSoon: boolean;
}

export function getCourseArtwork(
	course: Pick<CourseRecord, 'slug' | 'status' | 'artworkUrl'>
): CourseArtwork {
	if (course.artworkUrl) {
		return {
			posterSrc: course.artworkUrl,
			comingSoon: course.status !== 'available'
		};
	}

	if (course.status === 'available') {
		const poster = LAUNCH_COURSE_POSTERS[course.slug];
		if (poster) {
			return { posterSrc: poster, comingSoon: false };
		}
	}

	return {
		posterSrc: LANDING_CURRICULUM_PLACEHOLDER_SRC,
		comingSoon: course.status !== 'available'
	};
}

export function getModuleArtwork(
	module: Pick<CourseModuleRecord, 'id' | 'status' | 'thumbnailUrl'>
): CourseArtwork {
	if (module.thumbnailUrl) {
		return {
			posterSrc: module.thumbnailUrl,
			comingSoon: module.status !== 'available'
		};
	}

	if (module.status === 'available') {
		const poster = LAUNCH_MODULE_POSTERS[module.id];
		if (poster) {
			return { posterSrc: poster, comingSoon: false };
		}
	}

	return {
		posterSrc: LANDING_CURRICULUM_PLACEHOLDER_SRC,
		comingSoon: module.status !== 'available'
	};
}
