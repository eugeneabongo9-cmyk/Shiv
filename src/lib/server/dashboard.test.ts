import { describe, expect, it } from 'vitest';
import { buildDashboardActivitySnapshot, pickNextEvent, resolveNextRsvpEvent } from './dashboard';
import type { ActivityUpdateRecord, EventRecord, ResumeModuleRecord } from './db/shivworks';

const baseEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
	id: 'event-1',
	slug: 'live-1',
	title: 'Member livestream',
	description: '',
	eventKind: 'livestream',
	accessTier: 'member',
	status: 'scheduled',
	startsAt: Date.parse('2026-06-20T18:00:00.000Z'),
	endsAt: null,
	locationType: 'youtube',
	embedUrl: null,
	bookingUrl: null,
	reminderEnabled: true,
	...overrides
});

describe('pickNextEvent', () => {
	it('prefers live events over scheduled', () => {
		const next = pickNextEvent([
			baseEvent({ id: 'a', status: 'scheduled', startsAt: 100 }),
			baseEvent({ id: 'b', status: 'live', startsAt: 200 })
		]);
		expect(next?.id).toBe('b');
	});
});

describe('resolveNextRsvpEvent', () => {
	it('returns null when member has no going RSVPs', () => {
		expect(resolveNextRsvpEvent([baseEvent()], {})).toBeNull();
	});

	it('returns the next going event', () => {
		const rsvp = resolveNextRsvpEvent([baseEvent()], { 'event-1': 'going' });
		expect(rsvp?.title).toBe('Member livestream');
		expect(rsvp?.href).toBe('/live');
	});
});

describe('buildDashboardActivitySnapshot', () => {
	it('maps resume progress and latest update', () => {
		const resume: ResumeModuleRecord = {
			moduleId: 'module_muc',
			currentSeconds: 90,
			durationSeconds: 180,
			completedAt: null,
			updatedAt: 1_700_000_000_000,
			courseSlug: 'muc',
			courseTitle: 'MUC',
			courseAccessTier: 'member',
			courseStatus: 'available',
			courseArtworkUrl: null,
			moduleTitle: 'Module 1',
			moduleStatus: 'available',
			moduleThumbnailUrl: null
		};
		const updates: ActivityUpdateRecord[] = [
			{
				id: 'u1',
				title: 'Build update',
				bodyMarkdown: 'Body',
				audience: 'member',
				publishedAt: 1_700_000_100_000,
				authorName: null
			}
		];

		const snapshot = buildDashboardActivitySnapshot({
			resumeItem: resume,
			gamification: {
				memberId: 'user_1',
				rank: 'Recruit',
				trainingPoints: 120,
				streakDays: 3,
				lastActivityDate: null,
				updatedAt: new Date().toISOString()
			},
			updates,
			events: [],
			rsvpByEventId: {}
		});

		expect(snapshot.resume?.progressLabel).toContain('% watched');
		expect(snapshot.resume?.displayTitle).toBe('Module 1');
		expect(snapshot.resume?.progressPercent).toBe(50);
		expect(snapshot.resume?.artworkSrc).toBe('/landing/trailers/muc.jpg');
		expect(snapshot.latestUpdate?.title).toBe('Build update');
		expect(snapshot.gamification.trainingPoints).toBe(120);
	});
});
