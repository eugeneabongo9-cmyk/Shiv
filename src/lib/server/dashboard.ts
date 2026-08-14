import type {
	ActivityUpdateRecord,
	EventRecord,
	MemberGamificationRecord,
	ResumeModuleRecord
} from '$lib/server/db/shivworks';
import { getCourseArtwork, getModuleArtwork } from '$lib/library/course-artwork';

export type DashboardActivitySnapshot = {
	resume: {
		courseTitle: string;
		moduleTitle: string;
		displayTitle: string;
		artworkSrc: string;
		artworkComingSoon: boolean;
		href: string;
		progressLabel: string;
		progressPercent: number;
		updatedAt: number;
	} | null;
	gamification: {
		rank: string | null;
		trainingPoints: number;
		streakDays: number;
	};
	nextRsvp: {
		title: string;
		startsAt: number | null;
		status: EventRecord['status'];
		href: string;
	} | null;
	latestUpdate: {
		title: string;
		publishedAt: number;
		href: string;
	} | null;
};

export function pickNextEvent(events: EventRecord[]): EventRecord | null {
	if (events.length === 0) return null;

	return [...events].sort((left, right) => {
		const statusWeight = (status: EventRecord['status']) =>
			status === 'live' ? 0 : status === 'scheduled' ? 1 : 2;
		const statusDelta = statusWeight(left.status) - statusWeight(right.status);
		if (statusDelta !== 0) return statusDelta;

		const leftTime = left.startsAt ?? Number.MAX_SAFE_INTEGER;
		const rightTime = right.startsAt ?? Number.MAX_SAFE_INTEGER;

		if (left.status === 'ended' && right.status === 'ended') {
			return rightTime - leftTime;
		}

		return leftTime - rightTime;
	})[0];
}

function formatResumeProgress(resume: ResumeModuleRecord): string {
	if (resume.completedAt) {
		return 'Completed on this account';
	}
	if (resume.durationSeconds && resume.durationSeconds > 0) {
		return `${Math.round((resume.currentSeconds / resume.durationSeconds) * 100)}% watched`;
	}
	const minutes = Math.floor(resume.currentSeconds / 60)
		.toString()
		.padStart(2, '0');
	const seconds = (resume.currentSeconds % 60).toString().padStart(2, '0');
	return `Resume from ${minutes}:${seconds}`;
}

function getResumeProgressPercent(resume: ResumeModuleRecord): number {
	if (resume.completedAt) {
		return 100;
	}
	if (resume.durationSeconds && resume.durationSeconds > 0) {
		return Math.min(
			100,
			Math.max(0, Math.round((resume.currentSeconds / resume.durationSeconds) * 100))
		);
	}
	return 0;
}

export function resolveNextRsvpEvent(
	events: EventRecord[],
	rsvpByEventId: Record<string, string>
): DashboardActivitySnapshot['nextRsvp'] {
	const going = events.filter((event) => rsvpByEventId[event.id] === 'going');
	if (going.length === 0) return null;

	const next = pickNextEvent(going);
	if (!next) return null;

	return {
		title: next.title,
		startsAt: next.startsAt,
		status: next.status,
		href: '/live'
	};
}

export function buildDashboardActivitySnapshot(input: {
	resumeItem: ResumeModuleRecord | null;
	gamification: MemberGamificationRecord;
	updates: ActivityUpdateRecord[];
	events: EventRecord[];
	rsvpByEventId: Record<string, string>;
}): DashboardActivitySnapshot {
	const leadUpdate = input.updates[0] ?? null;
	const resumeArtwork = input.resumeItem
		? getModuleArtwork({
				id: input.resumeItem.moduleId,
				status: input.resumeItem.moduleStatus,
				thumbnailUrl: input.resumeItem.moduleThumbnailUrl
			})
		: null;
	const courseArtwork =
		input.resumeItem && resumeArtwork?.comingSoon
			? getCourseArtwork({
					slug: input.resumeItem.courseSlug,
					status: input.resumeItem.courseStatus,
					artworkUrl: input.resumeItem.courseArtworkUrl
				})
			: null;
	const bestArtwork = courseArtwork && !courseArtwork.comingSoon ? courseArtwork : resumeArtwork;

	return {
		resume: input.resumeItem
			? {
					courseTitle: input.resumeItem.courseTitle,
					moduleTitle: input.resumeItem.moduleTitle,
					displayTitle: input.resumeItem.moduleTitle,
					artworkSrc: bestArtwork!.posterSrc,
					artworkComingSoon: bestArtwork!.comingSoon,
					href: `/library/${input.resumeItem.courseSlug}?module=${input.resumeItem.moduleId}`,
					progressLabel: formatResumeProgress(input.resumeItem),
					progressPercent: getResumeProgressPercent(input.resumeItem),
					updatedAt: input.resumeItem.updatedAt
				}
			: null,
		gamification: {
			rank: input.gamification.rank,
			trainingPoints: input.gamification.trainingPoints,
			streakDays: input.gamification.streakDays
		},
		nextRsvp: resolveNextRsvpEvent(input.events, input.rsvpByEventId),
		latestUpdate: leadUpdate
			? {
					title: leadUpdate.title,
					publishedAt: leadUpdate.publishedAt,
					href: '/updates'
				}
			: null
	};
}
