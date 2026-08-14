import type { PageServerLoad } from './$types';
import { requirePaidMember } from '$lib/server/guards';

// /messages — launch placeholder. The full DM surface (Aaron's repo has
// conversation threads, moderation, realtime delivery) ships post-launch.
// We gate this on paid membership so the nav surface stays consistent with
// where the real feature will live.
export const load: PageServerLoad = async ({ locals }) => {
	const user = requirePaidMember(locals, '/messages');
	return { user };
};
