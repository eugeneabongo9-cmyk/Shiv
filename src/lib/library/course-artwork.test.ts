import { describe, expect, it } from 'vitest';
import { LANDING_CURRICULUM_PLACEHOLDER_SRC } from '$lib/constants/landing';
import { getCourseArtwork, getModuleArtwork } from '$lib/library/course-artwork';

describe('getCourseArtwork', () => {
	it('shows coming soon overlay for roadmap courses', () => {
		expect(
			getCourseArtwork({
				slug: 'physical-confrontation-confirmed',
				artworkUrl: null,
				status: 'coming_soon'
			})
		).toEqual({
			posterSrc: LANDING_CURRICULUM_PLACEHOLDER_SRC,
			comingSoon: true
		});
	});

	it('uses origin story poster for the origin story course', () => {
		expect(
			getCourseArtwork({
				slug: 'shivworks-origin-story',
				artworkUrl: null,
				status: 'available'
			})
		).toEqual({
			posterSrc: '/landing/trailers/origin-story.jpg',
			comingSoon: false
		});
	});

	it('uses MUC poster for the MUC course', () => {
		expect(
			getCourseArtwork({
				slug: 'managing-unknown-contacts',
				artworkUrl: null,
				status: 'available'
			})
		).toEqual({
			posterSrc: '/landing/trailers/muc.jpg',
			comingSoon: false
		});
	});

	it('prefers artworkUrl from the catalog when set', () => {
		expect(
			getCourseArtwork({
				slug: 'shivworks-origin-story',
				artworkUrl: '/custom/poster.jpg',
				status: 'available'
			})
		).toEqual({
			posterSrc: '/custom/poster.jpg',
			comingSoon: false
		});
	});

	it('falls back to shared placeholder for available courses without a poster', () => {
		expect(
			getCourseArtwork({
				slug: 'shivworks-core-skills',
				artworkUrl: null,
				status: 'available'
			})
		).toEqual({
			posterSrc: LANDING_CURRICULUM_PLACEHOLDER_SRC,
			comingSoon: false
		});
	});
});

describe('getModuleArtwork', () => {
	it('shows coming soon for unavailable modules', () => {
		expect(
			getModuleArtwork({
				id: 'module_wrestling',
				thumbnailUrl: null,
				status: 'coming_soon'
			})
		).toEqual({
			posterSrc: LANDING_CURRICULUM_PLACEHOLDER_SRC,
			comingSoon: true
		});
	});

	it('uses origin story poster for the origin module', () => {
		expect(
			getModuleArtwork({
				id: 'module_origin',
				thumbnailUrl: null,
				status: 'available'
			})
		).toEqual({
			posterSrc: '/landing/trailers/origin-story.jpg',
			comingSoon: false
		});
	});

	it('uses CAP poster for the CAP module', () => {
		expect(
			getModuleArtwork({
				id: 'module_cap',
				thumbnailUrl: null,
				status: 'available'
			})
		).toEqual({
			posterSrc: '/landing/trailers/cap.jpg',
			comingSoon: false
		});
	});

	it('uses CAP poster for the CAP course', () => {
		expect(
			getCourseArtwork({
				slug: 'criminal-assault-paradigm',
				artworkUrl: null,
				status: 'available'
			})
		).toEqual({
			posterSrc: '/landing/trailers/cap.jpg',
			comingSoon: false
		});
	});

	it('uses roadshow poster for The Roadshow series', () => {
		expect(
			getCourseArtwork({
				slug: 'the-roadshow',
				artworkUrl: null,
				status: 'available'
			})
		).toEqual({
			posterSrc: '/landing/trailers/roadshow.jpg',
			comingSoon: false
		});
	});
});
