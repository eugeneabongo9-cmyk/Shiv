import {
	UPCOMING_COHORT_SUMMARY,
	UPCOMING_CONTENT_DROPS,
	UPCOMING_TIER_EXPECTATIONS,
	type UpcomingContentDrop
} from '$lib/constants/upcoming-content';
import {
	MEMBERSHIP_TIERS,
	type MembershipTier,
	isMemberTier,
	isPaidMemberTier
} from '$lib/constants/tiers';
import type {
	UpcomingCountdown,
	UpcomingItem,
	UpcomingLane,
	UpcomingTracker
} from '$lib/upcoming/types';
import type { CourseRecord, EventRecord } from '$lib/server/db/shivworks';

export type { UpcomingCountdown, UpcomingItem, UpcomingTracker };

export function formatUpcomingReleaseLabel(releaseAt: number | null, now = Date.now()): string {
	if (!releaseAt) {
		return 'Date TBA';
	}

	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short'
	}).format(new Date(releaseAt));
}

export function viewerMeetsTierGate(
	viewerTier: MembershipTier | null | undefined,
	gate: UpcomingContentDrop['tierGate']
): boolean {
	if (gate === 'free') return true;
	if (!viewerTier || viewerTier === 'free') return false;
	if (gate === 'bronze') return isPaidMemberTier(viewerTier);
	return viewerTier === 'vip';
}

function parseReleaseAt(value: string | null): number | null {
	if (!value) return null;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function mapScheduledDrop(drop: UpcomingContentDrop): UpcomingItem {
	const releaseAt = parseReleaseAt(drop.releaseAt);
	return {
		id: drop.id,
		title: drop.title,
		detail: drop.detail,
		releaseAt,
		releaseLabel: formatUpcomingReleaseLabel(releaseAt),
		lane: drop.lane,
		source: 'schedule'
	};
}

function mapRoadmapCourse(course: CourseRecord): UpcomingItem {
	return {
		id: `course-${course.slug}`,
		title: course.title,
		detail: course.description || 'Tracking in the library release queue.',
		releaseAt: null,
		releaseLabel: 'Roadmap',
		lane: 'library',
		source: 'course'
	};
}

function sortUpcoming(left: UpcomingItem, right: UpcomingItem): number {
	if (left.releaseAt && right.releaseAt) {
		return left.releaseAt - right.releaseAt;
	}
	if (left.releaseAt) return -1;
	if (right.releaseAt) return 1;
	return left.title.localeCompare(right.title);
}

function dedupeUpcoming(items: UpcomingItem[], limit: number): UpcomingItem[] {
	const seen = new Set<string>();
	return items
		.filter((item) => {
			if (seen.has(item.id)) return false;
			seen.add(item.id);
			return true;
		})
		.sort(sortUpcoming)
		.slice(0, limit);
}

function resolveCountdown(
	upcoming: UpcomingItem[],
	events: EventRecord[],
	now: number,
	lane?: UpcomingLane | null
): UpcomingCountdown {
	const laneEvents = events.filter((event) => {
		if (lane && lane !== 'live') return false;
		return event.status === 'scheduled' && event.startsAt !== null && event.startsAt > now;
	});

	const nextEvent = laneEvents.sort((a, b) => (a.startsAt ?? 0) - (b.startsAt ?? 0))[0];
	if (nextEvent?.startsAt) {
		return {
			label: nextEvent.title,
			detail: 'Next scheduled touchpoint in the Live lane.',
			targetAt: nextEvent.startsAt
		};
	}

	const laneDrops = lane ? upcoming.filter((item) => item.lane === lane) : upcoming;
	const nextDrop = laneDrops.find((item) => item.releaseAt && item.releaseAt > now);
	if (nextDrop?.releaseAt) {
		return {
			label: nextDrop.title,
			detail: nextDrop.detail,
			targetAt: nextDrop.releaseAt
		};
	}

	return {
		label: lane ? `${lane} release cadence` : 'Release cadence',
		detail: 'The next dated drop will appear here once it is scheduled.',
		targetAt: null
	};
}

export function buildUpcomingTracker(input: {
	tier: MembershipTier | null | undefined;
	lane?: UpcomingLane | null;
	courses?: CourseRecord[];
	events?: EventRecord[];
	now?: number;
	limit?: number;
}): UpcomingTracker {
	const now = input.now ?? Date.now();
	const lane = input.lane ?? null;

	const staticItems = UPCOMING_CONTENT_DROPS.filter(
		(drop) => viewerMeetsTierGate(input.tier, drop.tierGate) && (!lane || drop.lane === lane)
	).map(mapScheduledDrop);

	const roadmapItems =
		lane === null || lane === 'library'
			? (input.courses ?? [])
					.filter((course) => course.status === 'coming_soon')
					.slice(0, 4)
					.map(mapRoadmapCourse)
			: [];

	const upcoming = dedupeUpcoming([...staticItems, ...roadmapItems], input.limit ?? 6);

	return {
		upcoming,
		countdown: resolveCountdown(upcoming, input.events ?? [], now, lane)
	};
}

export type WelcomeExperience = UpcomingTracker & {
	tierLabel: string;
	tierBadge: string;
	tierHighlights: string[];
	whatToExpect: string[];
	cohortSummary: string;
};

export function buildWelcomeExperience(input: {
	tier: MembershipTier | null;
	courses: CourseRecord[];
	events: EventRecord[];
	now?: number;
}): WelcomeExperience {
	const tierKey = isMemberTier(input.tier) ? input.tier : 'bronze';
	const tier = MEMBERSHIP_TIERS[tierKey];
	const tracker = buildUpcomingTracker({
		tier: input.tier,
		courses: input.courses,
		events: input.events,
		now: input.now
	});

	return {
		...tracker,
		tierLabel: tier.label,
		tierBadge: tier.badge,
		tierHighlights: [...tier.highlights],
		whatToExpect: [...UPCOMING_TIER_EXPECTATIONS[tierKey]],
		cohortSummary: UPCOMING_COHORT_SUMMARY
	};
}
