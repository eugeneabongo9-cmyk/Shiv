// Launch gating renders ComingSoon for deferred routes. Admins can still preview
// the underlying pages while members see the launch-safe placeholder.

import { isPaidMemberTier } from '$lib/constants/tiers';
import type { GatedRouteMeta } from '$lib/gated-route-meta';
import type { MemberRecord } from '$lib/server/db/shivworks';

export type { ComingSoonIcon, ComingSoonTrackerMode, GatedRouteMeta } from '$lib/gated-route-meta';
/**
 * Routes gated for launch. Key is the route prefix; matches `pathname ===
 * prefix` or `pathname.startsWith(prefix + '/')`. Order does not matter; the
 * longest matching prefix is preferred.
 *
 * To un-gate a route post-launch: delete its entry. No other code changes.
 */
export const GATED_ROUTES: Record<string, GatedRouteMeta> = {
	'/updates': {
		name: 'Updates',
		eyebrow: 'Build log',
		eta: 'Opens with the first curriculum drop',
		body: 'Release notes, filming progress, and member announcements — in one feed.',
		icon: 'updates',
		surface: 'updates',
		upcomingLane: 'library',
		highlights: [
			'New module announcements',
			'Live session schedule changes',
			'Filming and rollout briefs'
		],
		trackerMode: 'drops',
		trackerHeading: 'On the roadmap',
		fallback: { label: 'Browse the library', href: '/library' }
	},
	'/messages': {
		name: 'Coming Soon',
		eta: 'Messages are being staged',
		body: 'Member-to-member messaging is not active yet.'
	},
	'/leaderboard': {
		name: 'Coming Soon',
		eta: 'Leaderboard is planned for July 2026',
		body: 'Training Points and ranking will open once the first leaderboard release is ready.'
	},
	'/find-partners': {
		name: 'Coming Soon',
		eta: 'Find Partners is being staged',
		body: 'The partner finder will open once member profiles and opt-in visibility are ready.'
	},
	'/profile': {
		name: 'Member dossier',
		eta: 'Post-launch',
		body: 'Public profile pages for members. Use /account in the meantime to manage your own training profile.'
	},
	// Re-gated 2026-08-13 on the owner's explicit instruction.
	//
	// Both surfaces were un-gated on 2026-07-29/30 (commits 3e36400, 036482c)
	// without sign-off from Max or Aaron, so paying members have been seeing
	// unapproved sections. Neither has approved content or an approved design.
	//
	// Remove these two entries — and nothing else — once they are signed off.
	'/community': {
		name: 'Coming Soon',
		eta: 'Community is being staged',
		body: 'The member community is not open yet. We will announce it here as soon as it is ready.',
		fallback: { label: 'Browse the library', href: '/library' }
	},
	'/vip-calls': {
		name: 'Coming Soon',
		eta: 'VIP calls are being staged',
		body: 'VIP call booking is not open yet. This does not affect your VIP membership or your access to the library.',
		fallback: { label: 'Browse the library', href: '/library' }
	}
};

/**
 * Find the longest matching gated-route prefix for a pathname.
 * Returns the meta + the matched prefix, or null if not gated.
 */
export function findGatedMatch(pathname: string): (GatedRouteMeta & { prefix: string }) | null {
	let best: (GatedRouteMeta & { prefix: string }) | null = null;
	for (const [prefix, meta] of Object.entries(GATED_ROUTES)) {
		if (pathname === prefix || pathname.startsWith(prefix + '/')) {
			if (!best || prefix.length > best.prefix.length) {
				best = { ...meta, prefix };
			}
		}
	}
	return best;
}

/**
 * Returns the gate meta for the current route + viewer, or null if the route is
 * not gated or the viewer is bypassed.
 */
export function isLaunchGated(
	pathname: string,
	viewer: Pick<MemberRecord, 'role' | 'tier'> | null | undefined
): (GatedRouteMeta & { prefix: string }) | null {
	if (viewer?.role === 'admin') return null;
	if (
		(pathname === '/library' || pathname.startsWith('/library/')) &&
		isPaidMemberTier(viewer?.tier)
	) {
		return null;
	}
	return findGatedMatch(pathname);
}
