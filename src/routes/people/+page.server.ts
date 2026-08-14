import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// /people redirects to /find-partners — D-1 (2026-05-31): old public-bio
// member_profiles schema retired in favor of training-profile schema (member
// directory with filterable background/location/goal). /find-partners is the
// new home for "discover other members."
export const load: PageServerLoad = async () => {
	redirect(307, '/find-partners');
};
