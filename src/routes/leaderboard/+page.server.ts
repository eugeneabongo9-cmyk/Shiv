import type { PageServerLoad } from './$types';
import { requirePaidMember } from '$lib/server/guards';

// /leaderboard — launch placeholder. Per D-2 (2026-05-31): the full
// gamification system (training points, ranks, milestones, streaks) ships
// post-launch. The leaderboard opt-in toggle in /account already persists
// member preference, so when the surface lands, opt-ins are pre-captured.
export const load: PageServerLoad = async ({ locals }) => {
	const user = requirePaidMember(locals, '/leaderboard');
	return { user };
};
