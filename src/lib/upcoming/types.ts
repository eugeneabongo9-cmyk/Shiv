/** Client-safe upcoming tracker types (do not import $lib/server/* in .svelte). */

export type UpcomingLane = 'library' | 'live' | 'community' | 'general';

export type UpcomingItem = {
	id: string;
	title: string;
	detail: string;
	releaseAt: number | null;
	releaseLabel: string;
	lane: UpcomingLane;
	source: 'schedule' | 'course' | 'event';
};

export type UpcomingCountdown = {
	label: string;
	detail: string;
	targetAt: number | null;
};

export type UpcomingTracker = {
	upcoming: UpcomingItem[];
	countdown: UpcomingCountdown;
};
