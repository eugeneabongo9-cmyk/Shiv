import type { PageServerLoad } from './$types';
import { requireAuthenticated } from '$lib/server/guards';
import { isPaidMemberTier } from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	claimImportedMemberProvision,
	getMemberByClerkId,
	getUnclaimedImportForEmail,
	listCourses,
	listEvents
} from '$lib/server/db/shivworks';
import { bust } from '$lib/server/kv-cache';
import { buildWelcomeExperience } from '$lib/server/welcome';
import { sanitizeInternalRedirect } from '$lib/utils/redirects';

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	const user = requireAuthenticated(locals, '/welcome');
	const accessRevoked =
		user.accessStatus === 'revoked' || url.searchParams.get('access') === 'revoked';
	const ready =
		!accessRevoked &&
		(user.role === 'admin' || (isPaidMemberTier(user.tier) && user.accessStatus === 'active'));

	let pendingImport = false;
	let emailMismatch = false;
	let expectedCheckoutEmail: string | null = null;
	let claimAttempted = false;
	const db = getDBFromPlatform(platform);
	let experience = null;
	let currentUser = user;

	if (!ready && !accessRevoked) {
		pendingImport = Boolean(await getUnclaimedImportForEmail(db, user.email));

		// Stuck-buyer recovery: claim any active unclaimed import for this signed-in email.
		if (pendingImport) {
			claimAttempted = true;
			const claimed = await claimImportedMemberProvision(db, {
				clerkUserId: user.clerkUserId,
				email: user.email,
				name: user.name
			});
			if (claimed) {
				const kv = (
					platform as { env?: { KV?: import('@cloudflare/workers-types').KVNamespace } } | undefined
				)?.env?.KV;
				await bust(kv, `member:${user.clerkUserId}`, `courses:${user.clerkUserId}`);
				currentUser = (await getMemberByClerkId(db, user.clerkUserId)) ?? user;
				pendingImport = Boolean(await getUnclaimedImportForEmail(db, currentUser.email));
			}
		}

		const checkoutEmail = (url.searchParams.get('email') || '').trim().toLowerCase();
		if (checkoutEmail && checkoutEmail !== currentUser.email.trim().toLowerCase()) {
			expectedCheckoutEmail = checkoutEmail;
			emailMismatch = Boolean(await getUnclaimedImportForEmail(db, checkoutEmail));
		}
	}

	const resolvedReady =
		!accessRevoked &&
		(currentUser.role === 'admin' ||
			(isPaidMemberTier(currentUser.tier) && currentUser.accessStatus === 'active'));

	const purchasePending = pendingImport || emailMismatch;
	const needsMembershipPurchase = !resolvedReady && !purchasePending && !accessRevoked;

	if (resolvedReady) {
		const [courses, events] = await Promise.all([
			listCourses(db, currentUser),
			listEvents(db, currentUser)
		]);
		experience = buildWelcomeExperience({ tier: currentUser.tier, courses, events });
	}

	return {
		user: currentUser,
		ready: resolvedReady,
		accessRevoked,
		pendingImport,
		emailMismatch,
		expectedCheckoutEmail,
		needsMembershipPurchase,
		claimAttempted,
		redirectTo: sanitizeInternalRedirect(url.searchParams.get('returnTo'), '/dashboard'),
		experience
	};
};
