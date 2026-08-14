import { describe, expect, it } from 'vitest';
import { upcomingLaneForRoute } from '$lib/constants/upcoming-content';
import {
	buildUpcomingTracker,
	buildWelcomeExperience,
	formatUpcomingReleaseLabel,
	viewerMeetsTierGate
} from './upcoming-content';
import type { CourseRecord, EventRecord } from './db/shivworks';

const baseCourse = (overrides: Partial<CourseRecord> = {}): CourseRecord => ({
	id: 'course-1',
	slug: 'muc',
	title: 'Managing Unknown Contacts',
	description: 'Roadmap course',
	status: 'coming_soon',
	sortOrder: 10,
	badgeText: null,
	artworkUrl: null,
	courseKind: 'course',
	accessTier: 'member',
	totalModuleCount: 0,
	availableModuleCount: 0,
	roadmapModuleCount: 1,
	completedModuleCount: 0,
	startedModuleCount: 0,
	...overrides
});

const baseEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
	id: 'event-1',
	slug: 'live-1',
	title: 'Founding member livestream',
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

describe('upcomingLaneForRoute', () => {
	it('maps library paths to the library lane', () => {
		expect(upcomingLaneForRoute('/library')).toBe('library');
		expect(upcomingLaneForRoute('/library/origin-story')).toBe('library');
	});

	it('returns null for routes without a tracker lane', () => {
		expect(upcomingLaneForRoute('/dashboard')).toBeNull();
		expect(upcomingLaneForRoute('/messages')).toBeNull();
	});
});

describe('viewerMeetsTierGate', () => {
	it('hides bronze-gated drops from free viewers', () => {
		expect(viewerMeetsTierGate('free', 'bronze')).toBe(false);
		expect(viewerMeetsTierGate('bronze', 'bronze')).toBe(true);
		expect(viewerMeetsTierGate('vip', 'vip')).toBe(true);
	});
});

describe('buildUpcomingTracker', () => {
	it('filters library lane drops for ComingSoon reuse', () => {
		const tracker = buildUpcomingTracker({
			tier: 'bronze',
			lane: 'library',
			now: Date.parse('2026-06-03T12:00:00.000Z')
		});

		expect(tracker.upcoming.every((item) => item.lane === 'library')).toBe(true);
		expect(tracker.upcoming.length).toBeGreaterThan(0);
		expect(tracker.countdown.targetAt).toBe(Date.parse('2026-07-15T17:00:00.000Z'));
	});

	it('hides VIP-only drops from bronze members', () => {
		const tracker = buildUpcomingTracker({
			tier: 'bronze',
			now: Date.parse('2026-06-03T12:00:00.000Z')
		});

		expect(tracker.upcoming.some((item) => item.id === 'drop-vip-call-window')).toBe(false);
	});
});

describe('buildWelcomeExperience', () => {
	it('includes tier highlights and static upcoming drops for bronze members', () => {
		const experience = buildWelcomeExperience({
			tier: 'bronze',
			courses: [],
			events: [],
			now: Date.parse('2026-06-03T12:00:00.000Z')
		});

		expect(experience.tierBadge).toBe('Bronze');
		expect(experience.tierHighlights.length).toBeGreaterThan(0);
		expect(experience.whatToExpect.length).toBeGreaterThan(0);
		expect(experience.upcoming.length).toBeGreaterThan(0);
		expect(experience.upcoming[0]?.releaseAt).toBeTruthy();
	});

	it('prefers the next scheduled live event for the countdown target', () => {
		const experience = buildWelcomeExperience({
			tier: 'vip',
			courses: [baseCourse()],
			events: [baseEvent()],
			now: Date.parse('2026-06-03T12:00:00.000Z')
		});

		expect(experience.countdown.targetAt).toBe(Date.parse('2026-06-20T18:00:00.000Z'));
		expect(experience.countdown.label).toBe('Founding member livestream');
	});

	it('merges roadmap courses after dated schedule drops', () => {
		const experience = buildWelcomeExperience({
			tier: 'bronze',
			courses: [baseCourse({ slug: 'pcc', title: 'Physical Confrontation Confirmed' })],
			events: [],
			now: Date.parse('2026-06-03T12:00:00.000Z')
		});

		expect(experience.upcoming.some((item) => item.source === 'course')).toBe(true);
		expect(experience.upcoming.some((item) => item.releaseLabel === 'Roadmap')).toBe(true);
	});
});

describe('formatUpcomingReleaseLabel', () => {
	it('returns Date TBA when release time is missing', () => {
		expect(formatUpcomingReleaseLabel(null)).toBe('Date TBA');
	});
});
