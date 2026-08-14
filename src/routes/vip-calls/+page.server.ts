import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	listVipCallBookingsForMember,
	listVipCallRequestsForMember
} from '$lib/server/db/shivworks';
import { requirePaidMember } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requirePaidMember(locals, '/vip-calls');
	const vipAccess = user.role === 'admin' || user.tier === 'vip';
	const db = getDBFromPlatform(platform);

	if (!vipAccess) {
		return {
			user,
			vipAccess: false as const,
			requests: [],
			bookings: []
		};
	}

	return {
		user,
		vipAccess: true as const,
		requests: await listVipCallRequestsForMember(db, user.clerkUserId),
		bookings: await listVipCallBookingsForMember(db, user.clerkUserId)
	};
};
