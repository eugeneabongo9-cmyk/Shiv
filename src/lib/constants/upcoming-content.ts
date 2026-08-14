/**
 * Upcoming content schedule — Aaron edits `src/lib/data/upcoming-content.json`.
 * Imported here for typed access; no D1 migration required at launch.
 */
import raw from '$lib/data/upcoming-content.json';
import type { MembershipTier } from '$lib/constants/tiers';
import type { UpcomingLane } from '$lib/upcoming/types';

export type { UpcomingLane };

export type UpcomingTierGate = 'free' | MembershipTier;

export type UpcomingContentDrop = {
	id: string;
	title: string;
	detail: string;
	/** ISO-8601 UTC string, or null for “date TBA” */
	releaseAt: string | null;
	lane: UpcomingLane;
	/** Minimum tier required to see this drop in lists/countdown */
	tierGate: UpcomingTierGate;
};

type UpcomingContentFile = {
	cohortSummary: string;
	tierExpectations: Record<MembershipTier, string[]>;
	drops: UpcomingContentDrop[];
};

const file = raw as UpcomingContentFile;

export const UPCOMING_COHORT_SUMMARY = file.cohortSummary;
export const UPCOMING_TIER_EXPECTATIONS = file.tierExpectations;
export const UPCOMING_CONTENT_DROPS: UpcomingContentDrop[] = file.drops;

/** Gated routes that reuse the lane-filtered tracker on ComingSoon. */
export const UPCOMING_ROUTE_LANES: Partial<Record<string, UpcomingLane>> = {
	'/library': 'library',
	'/live': 'live',
	'/community': 'community',
	'/updates': 'general'
};

export function upcomingLaneForRoute(pathname: string): UpcomingLane | null {
	let best: { prefix: string; lane: UpcomingLane } | null = null;
	for (const [prefix, lane] of Object.entries(UPCOMING_ROUTE_LANES)) {
		if (!lane) continue;
		if (pathname === prefix || pathname.startsWith(prefix + '/')) {
			if (!best || prefix.length > best.prefix.length) {
				best = { prefix, lane };
			}
		}
	}
	return best?.lane ?? null;
}
