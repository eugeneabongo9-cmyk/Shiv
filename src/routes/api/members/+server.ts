// GET /api/members
// Returns founding-member purchase counts by tier for the live tracker widget.
// Counts WooCommerce/admin provisions (member_imports), not just signed-up members.
// Public, CORS-enabled for the WC store origin only (no wildcard).
// Cache-Control: public, max-age=60, stale-while-revalidate=30
//
// w257 — founding-member tracker endpoint.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { corsHeadersForRequest, rejectDisallowedBrowserOrigin } from '$lib/server/cors';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getFoundingMemberTrackerCounts } from '$lib/server/member-counts';

export const OPTIONS: RequestHandler = async ({ request }) => {
	const rejected = rejectDisallowedBrowserOrigin(request);
	if (rejected) return rejected;

	return new Response(null, { status: 204, headers: corsHeadersForRequest(request) });
};

export const GET: RequestHandler = async ({ request, platform, setHeaders }) => {
	const rejected = rejectDisallowedBrowserOrigin(request);
	if (rejected) return rejected;

	const headers = corsHeadersForRequest(request);
	setHeaders({
		'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
		...headers
	});

	const db = getDBFromPlatform(platform);
	const counts = await getFoundingMemberTrackerCounts(db);

	return json(counts);
};
