import type { D1Compat } from '$lib/server/d1-compat';
import {
	getFoundingMemberActiveCounts,
	getFoundingMemberPurchaseCounts
} from '$lib/server/member-counts';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
export const ANALYTICS_INACTIVITY_DAYS = 14;

export type AnalyticsRankedItem = {
	label: string;
	subtitle?: string;
	value: number;
};

export type AnalyticsInactiveMember = {
	name: string;
	email: string;
	tier: string;
	daysInactive: number;
};

export type AdminAnalyticsV1 = {
	founding: {
		bronzeSold: number;
		vipSold: number;
		bronzeSignedUp: number;
		vipSignedUp: number;
		bronzeClaimed30d: number;
		vipClaimed30d: number;
		awaitingSignup: number;
	};
	members: {
		total: number;
		free: number;
		bronze: number;
		vip: number;
		active: number;
	};
	engagement: {
		paidActiveTotal: number;
		dau: number;
		wau: number;
		mau: number;
		dauPct: number;
		wauPct: number;
		completions30d: number;
	};
	content: {
		topCourses: AnalyticsRankedItem[];
		topModules: AnalyticsRankedItem[];
	};
	retention: {
		inactiveCount: number;
		inactive: AnalyticsInactiveMember[];
	};
	ops: {
		pendingVipRequests: number;
		lessonsPublished: number;
		lessonsDraft: number;
		lessonsWithVideo: number;
	};
};

function pct(part: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((part / total) * 1000) / 10;
}

async function countAwaitingSignup(db: D1Compat): Promise<number> {
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS n
       FROM member_imports
       WHERE tier IN ('bronze', 'vip')
         AND claimed_at IS NULL`
		)
		.first<{ n: number | string }>();
	return Number(row?.n ?? 0);
}

export async function getClaimedSignupCountsSince(
	db: D1Compat,
	since: number
): Promise<{ bronze: number; vip: number }> {
	const row = await db
		.prepare(
			`SELECT
			 SUM(CASE WHEN tier = 'bronze' THEN 1 ELSE 0 END) AS bronze_count,
			 SUM(CASE WHEN tier = 'vip' THEN 1 ELSE 0 END) AS vip_count
			 FROM member_imports
			 WHERE claimed_at IS NOT NULL
			   AND claimed_at >= ?`
		)
		.bind(since)
		.first<{ bronze_count: number | string | null; vip_count: number | string | null }>();

	return {
		bronze: Number(row?.bronze_count ?? 0),
		vip: Number(row?.vip_count ?? 0)
	};
}

async function getMemberTierCounts(db: D1Compat): Promise<AdminAnalyticsV1['members']> {
	const rows = await db
		.prepare(
			`SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN tier = 'free' OR tier IS NULL THEN 1 ELSE 0 END) AS free_count,
         SUM(CASE WHEN tier = 'bronze' THEN 1 ELSE 0 END) AS bronze_count,
         SUM(CASE WHEN tier = 'vip' THEN 1 ELSE 0 END) AS vip_count,
         SUM(CASE WHEN access_status = 'active' THEN 1 ELSE 0 END) AS active_count
       FROM members`
		)
		.first<{
			total: number | string;
			free_count: number | string;
			bronze_count: number | string;
			vip_count: number | string;
			active_count: number | string;
		}>();

	return {
		total: Number(rows?.total ?? 0),
		free: Number(rows?.free_count ?? 0),
		bronze: Number(rows?.bronze_count ?? 0),
		vip: Number(rows?.vip_count ?? 0),
		active: Number(rows?.active_count ?? 0)
	};
}

type ActivityRow = { id: string; lastActive: number };

async function listPaidMemberActivity(db: D1Compat): Promise<ActivityRow[]> {
	const rows = await db
		.prepare(
			`SELECT m.clerk_user_id AS id,
              MAX(
                COALESCE(s.last_session, 0),
                COALESCE(mp.last_progress, 0),
                COALESCE(m.updated_at, 0)
              ) AS last_active
       FROM members m
       LEFT JOIN (
         SELECT member_id, MAX(last_active_at) AS last_session
         FROM member_sessions
         WHERE revoked_at IS NULL
         GROUP BY member_id
       ) s ON s.member_id = m.clerk_user_id
       LEFT JOIN (
         SELECT member_id, MAX(updated_at) AS last_progress
         FROM member_module_progress
         GROUP BY member_id
       ) mp ON mp.member_id = m.clerk_user_id
       WHERE m.access_status = 'active'
         AND m.tier IN ('bronze', 'vip')
       GROUP BY m.clerk_user_id`
		)
		.all<{ id: string; last_active: number | null }>();

	return rows.results.map((row) => ({
		id: String(row.id),
		lastActive: Number(row.last_active ?? 0)
	}));
}

export function countEngagementWindows(
	activity: ActivityRow[],
	paidActiveTotal: number,
	now: number
): Pick<AdminAnalyticsV1['engagement'], 'dau' | 'wau' | 'mau' | 'dauPct' | 'wauPct'> {
	let dau = 0;
	let wau = 0;
	let mau = 0;

	for (const row of activity) {
		if (!row.lastActive) continue;
		const age = now - row.lastActive;
		if (age <= DAY_MS) dau += 1;
		if (age <= WEEK_MS) wau += 1;
		if (age <= MONTH_MS) mau += 1;
	}

	const denominator = Math.max(1, paidActiveTotal);
	return {
		dau,
		wau,
		mau,
		dauPct: pct(dau, denominator),
		wauPct: pct(wau, denominator)
	};
}

async function countCompletions30d(db: D1Compat, now: number): Promise<number> {
	const since = now - MONTH_MS;
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS n
       FROM member_module_progress
       WHERE completed_at IS NOT NULL
         AND completed_at >= ?`
		)
		.bind(since)
		.first<{ n: number | string }>();
	return Number(row?.n ?? 0);
}

async function getTopCourses(db: D1Compat, since: number): Promise<AnalyticsRankedItem[]> {
	const rows = await db
		.prepare(
			`SELECT c.title AS label, COUNT(DISTINCT mp.member_id) AS value
       FROM member_module_progress mp
       JOIN course_modules cm ON cm.id = mp.module_id
       JOIN courses c ON c.id = cm.course_id
       WHERE mp.updated_at >= ?
       GROUP BY c.id, c.title
       ORDER BY value DESC, c.title ASC
       LIMIT 5`
		)
		.bind(since)
		.all<{ label: string; value: number | string }>();

	return rows.results.map((row) => ({
		label: String(row.label || 'Course'),
		value: Number(row.value ?? 0)
	}));
}

async function getTopModules(db: D1Compat, since: number): Promise<AnalyticsRankedItem[]> {
	const rows = await db
		.prepare(
			`SELECT cm.title AS module_title,
              c.title AS course_title,
              COUNT(DISTINCT mp.member_id) AS value
       FROM member_module_progress mp
       JOIN course_modules cm ON cm.id = mp.module_id
       JOIN courses c ON c.id = cm.course_id
       WHERE mp.updated_at >= ?
       GROUP BY cm.id, cm.title, c.title
       ORDER BY value DESC, cm.title ASC
       LIMIT 5`
		)
		.bind(since)
		.all<{ module_title: string; course_title: string; value: number | string }>();

	return rows.results.map((row) => ({
		label: String(row.module_title || 'Module'),
		subtitle: String(row.course_title || ''),
		value: Number(row.value ?? 0)
	}));
}

export async function listInactivePaidMembers(
	db: D1Compat,
	thresholdDays = ANALYTICS_INACTIVITY_DAYS,
	now = Date.now(),
	limit = 10
): Promise<{ total: number; members: AnalyticsInactiveMember[] }> {
	const cutoff = now - thresholdDays * DAY_MS;
	const rows = await db
		.prepare(
			`WITH paid_activity AS (
         SELECT
           m.clerk_user_id AS id,
           m.name,
           m.email,
           m.tier,
           MAX(
             COALESCE(s.last_session, 0),
             COALESCE(mp.last_progress, 0),
             COALESCE(m.updated_at, 0)
           ) AS last_active
         FROM members m
         LEFT JOIN (
           SELECT member_id, MAX(last_active_at) AS last_session
           FROM member_sessions
           WHERE revoked_at IS NULL
           GROUP BY member_id
         ) s ON s.member_id = m.clerk_user_id
         LEFT JOIN (
           SELECT member_id, MAX(updated_at) AS last_progress
           FROM member_module_progress
           GROUP BY member_id
         ) mp ON mp.member_id = m.clerk_user_id
         WHERE m.access_status = 'active'
           AND m.tier IN ('bronze', 'vip')
       ),
       inactive AS (
         SELECT id, name, email, tier, last_active
         FROM paid_activity
         WHERE last_active > 0 AND last_active <= ?
       )
       SELECT id, name, email, tier, last_active, COUNT(*) OVER () AS total
       FROM inactive
       ORDER BY last_active ASC, id ASC
       LIMIT ?`
		)
		.bind(cutoff, Math.max(0, Math.floor(limit)))
		.all<{
			id: string;
			name: string;
			email: string;
			tier: string | null;
			last_active: number | string;
			total: number | string;
		}>();

	return {
		total: Number(rows.results[0]?.total ?? 0),
		members: rows.results.map((row) => ({
			name: String(row.name || 'Member'),
			email: String(row.email || ''),
			tier: String(row.tier || 'member'),
			daysInactive: Math.floor((now - Number(row.last_active || 0)) / DAY_MS)
		}))
	};
}

async function getLessonOpsCounts(
	db: D1Compat
): Promise<
	Pick<AdminAnalyticsV1['ops'], 'lessonsPublished' | 'lessonsDraft' | 'lessonsWithVideo'>
> {
	const rows = await db
		.prepare(
			`SELECT
         cm.status,
         CASE
           WHEN ma.provider_asset_id IS NOT NULL AND ma.provider_asset_id != '' THEN 1
           ELSE 0
         END AS has_video
       FROM course_modules cm
       LEFT JOIN course_module_episodes cme
         ON cme.module_id = cm.id AND cme.episode_number = 1
       LEFT JOIN media_assets ma ON ma.id = cme.media_asset_id`
		)
		.all<{ status: string; has_video: number | string }>();

	let lessonsPublished = 0;
	let lessonsDraft = 0;
	let lessonsWithVideo = 0;

	for (const row of rows.results) {
		if (row.status === 'available') lessonsPublished += 1;
		if (row.status === 'coming_soon') lessonsDraft += 1;
		if (Number(row.has_video) > 0) lessonsWithVideo += 1;
	}

	return { lessonsPublished, lessonsDraft, lessonsWithVideo };
}

export async function getAdminAnalyticsV1(
	db: D1Compat,
	now: number = Date.now()
): Promise<AdminAnalyticsV1> {
	const since = now - MONTH_MS;
	const [
		sold,
		signedUp,
		claimed30d,
		awaitingSignup,
		members,
		activity,
		completions30d,
		topCourses,
		topModules,
		inactive,
		lessonOps,
		vipRow
	] = await Promise.all([
		getFoundingMemberPurchaseCounts(db),
		getFoundingMemberActiveCounts(db),
		getClaimedSignupCountsSince(db, since),
		countAwaitingSignup(db),
		getMemberTierCounts(db),
		listPaidMemberActivity(db),
		countCompletions30d(db, now),
		getTopCourses(db, since),
		getTopModules(db, since),
		listInactivePaidMembers(db, ANALYTICS_INACTIVITY_DAYS, now),
		getLessonOpsCounts(db),
		db
			.prepare(`SELECT COUNT(*) AS n FROM vip_call_requests WHERE status = 'requested'`)
			.first<{ n: number | string }>()
	]);

	const paidActiveTotal = signedUp.total;
	const engagementWindows = countEngagementWindows(activity, paidActiveTotal, now);

	return {
		founding: {
			bronzeSold: sold.bronze,
			vipSold: sold.vip,
			bronzeSignedUp: signedUp.bronze,
			vipSignedUp: signedUp.vip,
			bronzeClaimed30d: claimed30d.bronze,
			vipClaimed30d: claimed30d.vip,
			awaitingSignup
		},
		members,
		engagement: {
			paidActiveTotal,
			...engagementWindows,
			completions30d
		},
		content: {
			topCourses,
			topModules
		},
		retention: {
			inactiveCount: inactive.total,
			inactive: inactive.members
		},
		ops: {
			pendingVipRequests: Number(vipRow?.n ?? 0),
			...lessonOps
		}
	};
}
