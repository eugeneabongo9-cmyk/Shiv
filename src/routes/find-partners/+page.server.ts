import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { requirePaidMember } from '$lib/server/guards';
import {
	getMemberProfile,
	listFinderCandidates,
	type FinderBackgroundFilter
} from '$lib/server/db/shivworks';

const ALLOWED_BG: ReadonlySet<FinderBackgroundFilter> = new Set([
	'civilian',
	'le',
	'military',
	'medical',
	'other'
]);

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	const user = requirePaidMember(locals, '/find-partners');
	const db = getDBFromPlatform(platform);
	const viewerProfile = await getMemberProfile(db, user.clerkUserId);

	const params = url.searchParams;
	const stateRaw = params.get('state')?.trim().toUpperCase() || null;
	// Default to viewer's state on first visit (no params present at all).
	const state = params.has('state') ? stateRaw || null : (viewerProfile?.locationState ?? null);
	const cityQuery = params.get('city')?.trim() || null;
	const goalQuery = params.get('goal')?.trim() || null;
	const ecqcOnly = params.get('ecqc') === '1';
	const backgrounds = (params.getAll('bg') || [])
		.map((v) => v.toLowerCase())
		.filter((v): v is FinderBackgroundFilter => ALLOWED_BG.has(v as FinderBackgroundFilter));

	const candidates = await listFinderCandidates(db, user.clerkUserId, {
		state,
		cityQuery,
		goalQuery,
		ecqcOnly,
		backgrounds
	});

	const results = candidates.map((c) => ({
		member: {
			clerkUserId: c.member.clerkUserId,
			name: c.member.name,
			tier: c.member.tier
		},
		profile: {
			locationCity: c.profile.locationCity,
			locationState: c.profile.locationState,
			ecqcAlumni: c.profile.ecqcAlumni,
			mucAlumni: c.profile.mucAlumni,
			ewoAlumni: c.profile.ewoAlumni,
			trainingGoal: c.profile.trainingGoal,
			background: c.profile.background
		}
	}));

	return {
		viewer: {
			clerkUserId: user.clerkUserId,
			hasLocation: !!viewerProfile?.locationState,
			state: viewerProfile?.locationState ?? null
		},
		filters: { state, cityQuery, goalQuery, ecqcOnly, backgrounds },
		results
	};
};
