import type { D1Compat } from '$lib/server/d1-compat';

export type FoundingMemberCounts = {
	bronze: number;
	vip: number;
	total: number;
};

/** Purchases and admin imports keyed by email — source of truth for spots sold. */
export async function getFoundingMemberPurchaseCounts(db: D1Compat): Promise<FoundingMemberCounts> {
	const rows = await db
		.prepare(
			`SELECT tier, COUNT(*) AS count
       FROM member_imports
       WHERE tier IN ('bronze', 'vip')
       GROUP BY tier`
		)
		.all<{ tier: string; count: number }>();

	let bronze = 0;
	let vip = 0;

	for (const row of rows.results ?? []) {
		if (row.tier === 'bronze') bronze = Number(row.count);
		if (row.tier === 'vip') vip = Number(row.count);
	}

	return { bronze, vip, total: bronze + vip };
}

/** Paid members who finished Clerk signup — subset of purchases that claimed access. */
export async function getFoundingMemberActiveCounts(db: D1Compat): Promise<FoundingMemberCounts> {
	const rows = await db
		.prepare(
			`SELECT tier, COUNT(*) AS count
       FROM members
       WHERE access_status = 'active'
         AND tier IN ('bronze', 'vip')
       GROUP BY tier`
		)
		.all<{ tier: string; count: number }>();

	let bronze = 0;
	let vip = 0;

	for (const row of rows.results ?? []) {
		if (row.tier === 'bronze') bronze = Number(row.count);
		if (row.tier === 'vip') vip = Number(row.count);
	}

	return { bronze, vip, total: bronze + vip };
}

/**
 * Landing + store tracker: purchases from WC/admin imports, with a floor from
 * active paid members when tier was set directly without an import row.
 */
export async function getFoundingMemberTrackerCounts(db: D1Compat): Promise<FoundingMemberCounts> {
	const [purchases, active] = await Promise.all([
		getFoundingMemberPurchaseCounts(db),
		getFoundingMemberActiveCounts(db)
	]);

	const bronze = Math.max(purchases.bronze, active.bronze);
	const vip = Math.max(purchases.vip, active.vip);

	return { bronze, vip, total: bronze + vip };
}
