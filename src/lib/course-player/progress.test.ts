import { describe, expect, it } from 'vitest';
import {
	canPlayEpisode,
	durationLabelToSeconds,
	getAdjacentEpisodes,
	getCourseDurationSeconds,
	getCoursePlayerNavigation,
	getModuleDurationSeconds,
	getProgressPercent,
	getProgressState,
	secondsToTotalDurationLabel
} from './progress';
import type { CourseModuleRecord, MediaAssetRecord } from '$lib/server/db/shivworks';
import type { CourseModuleEpisodeRecord } from '$lib/server/db/shivworks';

const readyMedia = (overrides: Partial<MediaAssetRecord> = {}): MediaAssetRecord => ({
	id: 'media-1',
	provider: 'cloudflare_stream',
	providerAssetId: 'stream_uid_1',
	title: 'Episode 1',
	fileName: 'episode-1.mp4',
	sourceUrl: null,
	sourceBytes: 5_000_000,
	durationSeconds: 600,
	durationLabel: '10 min',
	playbackPolicy: 'private',
	ingestStatus: 'ready',
	failureReason: null,
	createdByMemberId: 'admin_1',
	uploadedAt: Date.now(),
	playbackReadyAt: Date.now(),
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides
});

const episode = (
	overrides: Partial<CourseModuleEpisodeRecord> = {}
): CourseModuleEpisodeRecord => ({
	id: 'episode-1',
	courseId: 'course-1',
	courseSlug: 'course',
	courseTitle: 'Course',
	courseAccessTier: 'free',
	moduleId: 'module-1',
	moduleTitle: 'Module',
	mediaAssetId: null,
	episodeNumber: 1,
	title: 'Episode 1',
	description: null,
	status: 'available',
	accessTier: 'free',
	sortOrder: 1,
	durationLabel: null,
	media: null,
	...overrides
});

const courseModule = (overrides: Partial<CourseModuleRecord> = {}): CourseModuleRecord => ({
	id: 'module-1',
	courseId: 'course-1',
	title: 'Module 1',
	description: null,
	sortOrder: 1,
	status: 'available',
	videoKind: 'none',
	videoUrl: null,
	durationLabel: null,
	thumbnailUrl: null,
	publishedAt: null,
	accessTier: 'free',
	...overrides
});

describe('course player progress helpers', () => {
	it('returns completion percent', () => {
		expect(
			getProgressPercent({
				currentSeconds: 45,
				durationSeconds: 90,
				completedAt: null,
				updatedAt: 1
			})
		).toBe(50);
	});

	it('labels completed progress', () => {
		expect(
			getProgressState({
				currentSeconds: 90,
				durationSeconds: 90,
				completedAt: 1,
				updatedAt: 1
			})
		).toBe('Completed');
	});

	it('parses minute labels into seconds', () => {
		expect(durationLabelToSeconds('26 min')).toBe(1560);
		expect(durationLabelToSeconds('20:10')).toBe(1210);
	});

	it('sums chapter durations for multi-episode modules', () => {
		const module: CourseModuleRecord = {
			id: 'module_muc',
			courseId: 'course_muc',
			title: 'Managing Unknown Contacts',
			description: null,
			sortOrder: 1,
			status: 'available',
			videoKind: 'none',
			videoUrl: null,
			durationLabel: null,
			thumbnailUrl: null,
			publishedAt: null,
			accessTier: 'free'
		};

		const episodes = [
			episode({ id: 'a', moduleId: 'module_muc', episodeNumber: 1, durationLabel: '01:17' }),
			episode({ id: 'b', moduleId: 'module_muc', episodeNumber: 2, durationLabel: '07:42' }),
			episode({ id: 'c', moduleId: 'module_muc', episodeNumber: 3, durationLabel: '05:59' })
		];

		expect(getModuleDurationSeconds(module, episodes)).toBe(77 + 462 + 359);
		expect(secondsToTotalDurationLabel(getModuleDurationSeconds(module, episodes))).toBe('15 min');
		expect(secondsToTotalDurationLabel(getCourseDurationSeconds([module], episodes))).toBe(
			'15 min'
		);
	});

	it('finds previous and next episodes', () => {
		const adjacent = getAdjacentEpisodes(
			[
				episode({ id: 'a', episodeNumber: 1 }),
				episode({ id: 'b', episodeNumber: 2 }),
				episode({ id: 'c', episodeNumber: 3 })
			],
			'b'
		);
		expect(adjacent.previous?.id).toBe('a');
		expect(adjacent.next?.id).toBe('c');
	});

	it('continues from the last episode into the next module', () => {
		const navigation = getCoursePlayerNavigation({
			modules: [
				courseModule(),
				courseModule({
					id: 'module-2',
					title: 'Module 2',
					sortOrder: 2,
					videoKind: 'embed',
					videoUrl: 'https://example.com/video'
				})
			],
			episodes: [
				episode({ id: 'a', media: readyMedia(), moduleId: 'module-1' }),
				episode({
					id: 'archived',
					moduleId: 'module-1',
					status: 'archived',
					sortOrder: 2,
					media: readyMedia()
				})
			],
			selectedModuleId: 'module-1',
			selectedEpisodeId: 'a'
		});

		expect(navigation.next).toEqual({
			kind: 'module',
			moduleId: 'module-2',
			episodeId: null,
			title: 'Module 2'
		});
	});

	it('moves from direct module playback to the next playable episode', () => {
		const navigation = getCoursePlayerNavigation({
			modules: [
				courseModule({
					id: 'module_origin',
					title: 'Origin Story'
				}),
				courseModule({ id: 'module-2', title: 'Module 2', sortOrder: 2 })
			],
			episodes: [
				episode({ id: 'mirror', moduleId: 'module_origin', media: readyMedia() }),
				episode({ id: 'next', moduleId: 'module-2', media: readyMedia() })
			],
			selectedModuleId: 'module_origin',
			selectedEpisodeId: null
		});

		expect(navigation.next?.episodeId).toBe('next');
	});

	it('skips locked and archived episodes in navigation', () => {
		const navigation = getCoursePlayerNavigation({
			modules: [courseModule()],
			episodes: [
				episode({ id: 'current', media: readyMedia() }),
				episode({
					id: 'processing',
					sortOrder: 2,
					episodeNumber: 2,
					media: readyMedia({ ingestStatus: 'processing' })
				}),
				episode({
					id: 'archived',
					sortOrder: 3,
					episodeNumber: 3,
					status: 'archived',
					media: readyMedia()
				})
			],
			selectedModuleId: 'module-1',
			selectedEpisodeId: 'current'
		});

		expect(navigation.next).toBeNull();
	});
});

describe('canPlayEpisode', () => {
	it('blocks playback when the media is not ready, even for an admin', () => {
		const notReady = episode({
			status: 'available',
			media: readyMedia({ ingestStatus: 'processing' })
		});
		expect(canPlayEpisode(notReady)).toBe(false);
		expect(canPlayEpisode(notReady, true)).toBe(false);
	});

	it('blocks a member from playing a ready episode that is not published yet', () => {
		const unpublished = episode({ status: 'coming_soon', media: readyMedia() });
		expect(canPlayEpisode(unpublished)).toBe(false);
	});

	it('lets an admin preview a ready episode before it is published', () => {
		const unpublished = episode({ status: 'coming_soon', media: readyMedia() });
		expect(canPlayEpisode(unpublished, true)).toBe(true);
	});

	it('lets any member play a ready, published episode', () => {
		const published = episode({ status: 'available', media: readyMedia() });
		expect(canPlayEpisode(published)).toBe(true);
	});
});
