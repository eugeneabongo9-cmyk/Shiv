import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// /profile placeholder — D-2 (2026-05-31): full dossier view depends on
// deferred gamification (rank, training points, recognitions, milestones,
// recent activity). Until gamification ships post-launch, redirect to
// /account where members can edit their training profile.
export const load: PageServerLoad = async () => {
	redirect(307, '/account');
};
