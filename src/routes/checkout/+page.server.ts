import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getActiveBronzeTier, VIP_TIER } from '$lib/constants/pricing';
import { SHIVWORKS_MEMBERSHIP_URL } from '$lib/constants/site';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { requireAuthenticated } from '$lib/server/guards';
import { getFoundingMemberTrackerCounts } from '$lib/server/member-counts';
import { getUnclaimedImportForEmail } from '$lib/server/db/shivworks';
import { sanitizeInternalRedirect } from '$lib/utils/redirects';

export type CheckoutPricing = {
	bronzePrice: string;
	bronzePriceNote: string;
	bronzeSpotsRemaining: number | null;
	vipPrice: string;
	vipSpotsRemaining: number | null;
};

function defaultPricing(): CheckoutPricing {
	return {
		bronzePrice: '$249',
		bronzePriceNote: 'Current founding tier price at checkout',
		bronzeSpotsRemaining: null,
		vipPrice: `$${VIP_TIER.price}`,
		vipSpotsRemaining: null
	};
}

async function loadCheckoutPricing(
	platform: Parameters<PageServerLoad>[0]['platform']
): Promise<CheckoutPricing> {
	try {
		const db = getDBFromPlatform(platform);
		const counts = await getFoundingMemberTrackerCounts(db);
		const activeBronze = getActiveBronzeTier(counts.bronze);

		return {
			bronzePrice: activeBronze ? `$${activeBronze.tier.price}` : '$399',
			bronzePriceNote: activeBronze
				? `${activeBronze.tier.label} · one-time lifetime access`
				: 'Final founding tier · one-time lifetime access',
			bronzeSpotsRemaining: activeBronze?.spotsRemaining ?? null,
			vipPrice: `$${VIP_TIER.price}`,
			vipSpotsRemaining: Math.max(0, VIP_TIER.totalSpots - counts.vip)
		};
	} catch {
		return defaultPricing();
	}
}

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	// DEV-ONLY preview bypass — temporary; revert before commit.
	// Lets us screenshot /checkout?preview=1 without Clerk dev keys.
	if (import.meta.env.DEV && url.searchParams.get('preview') === '1') {
		return {
			user: {
				clerkUserId: 'preview',
				email: 'preview@local',
				name: 'Preview',
				tier: 'free' as const,
				accessStatus: 'none' as const,
				role: 'member' as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			},
			redirectTo: '/dashboard',
			requiredTier: null,
			wcMembershipUrl: SHIVWORKS_MEMBERSHIP_URL,
			pricing: defaultPricing()
		};
	}
	const user = requireAuthenticated(locals, '/checkout');
	const redirectTo = sanitizeInternalRedirect(url.searchParams.get('redirect'), '/dashboard');
	const requiredTier = redirectTo === '/vip-calls' ? ('vip' as const) : null;
	const hasRequiredAccess =
		user.accessStatus === 'active' &&
		(user.role === 'admin' ||
			(requiredTier === 'vip' ? user.tier === 'vip' : user.tier !== 'free'));

	if (hasRequiredAccess) {
		redirect(302, redirectTo);
	}

	let pendingImport = false;
	try {
		const db = getDBFromPlatform(platform);
		pendingImport = Boolean(await getUnclaimedImportForEmail(db, user.email));
	} catch (error) {
		console.error('Unable to check pending member import before checkout', error);
	}
	if (pendingImport) {
		redirect(302, `/welcome?returnTo=${encodeURIComponent(redirectTo)}`);
	}

	return {
		user,
		redirectTo,
		requiredTier,
		wcMembershipUrl: SHIVWORKS_MEMBERSHIP_URL,
		pricing: await loadCheckoutPricing(platform)
	};
};
