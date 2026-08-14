/** Client-safe gated-route metadata types (shared by launch-gating + ComingSoon). */

import type { UpcomingLane } from '$lib/upcoming/types';

export type ComingSoonIcon =
	| 'sparkles'
	| 'community'
	| 'live'
	| 'updates'
	| 'messages'
	| 'leaderboard'
	| 'partners'
	| 'vip'
	| 'profile'
	| 'settings';

/** full = countdown + list; compact = date only; drops = roadmap rows; none = hide schedule */
export type ComingSoonTrackerMode = 'full' | 'compact' | 'drops' | 'none';

export interface GatedRouteFallback {
	label: string;
	href: string;
	external?: boolean;
}

export interface GatedRouteMeta {
	/** Friendly route name shown as the ComingSoon headline */
	name: string;
	/** Eyebrow above the headline (defaults to "Coming soon") */
	eyebrow?: string;
	/** Short status line shown below the headline */
	eta: string;
	/** Optional body copy below the ETA */
	body?: string;
	/** Icon treatment for the hero */
	icon?: ComingSoonIcon;
	/** CSS surface modifier (e.g. updates, community) */
	surface?: string;
	/** Short bullet list — what members get when this lane opens */
	highlights?: string[];
	/** Override lane filter for the upcoming tracker */
	upcomingLane?: UpcomingLane;
	/** How much of the upcoming schedule to show */
	trackerMode?: ComingSoonTrackerMode;
	/** Heading for tracker list / drops */
	trackerHeading?: string;
	/** Optional secondary action below the CTA */
	fallback?: GatedRouteFallback | null;
}
