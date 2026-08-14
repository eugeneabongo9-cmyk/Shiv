import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	getLeaderboardOptIn,
	getMemberProfile,
	listMemberEntitlements,
	setLeaderboardOptIn,
	upsertMemberProfile
} from '$lib/server/db/shivworks';
import type { MemberProfileRecord } from '$lib/server/db/shivworks';
import { awardPoints } from '$lib/server/gamification';
import { requireAuthenticated } from '$lib/server/guards';

export const _ACCOUNT_SEEN_COOKIE = 'sw_account_seen';

const STATE_REGEX = /^[A-Z]{2}$/;
const MAX_CITY = 80;
const MAX_STATE = 2;
const MAX_TEXT = 280;
const MAX_LONG_TEXT = 1000;

function readChecked(data: FormData, key: string): boolean {
	return data.get(key) !== null;
}

function readTrimmed(data: FormData, key: string, max: number): string | null {
	const raw = data.get(key);
	if (typeof raw !== 'string') return null;
	const trimmed = raw.trim();
	if (!trimmed) return null;
	return trimmed.slice(0, max);
}

interface ProfileFormErrors {
	locationCity?: string;
	locationState?: string;
	background?: string;
	trainingGoal?: string;
	otherCourses?: string;
	carrySetup?: string;
}

export function _isProfileComplete(profile: MemberProfileRecord | null): boolean {
	if (!profile) return false;
	if (!profile.locationCity) return false;
	if (!profile.locationState) return false;
	if (!profile.trainingGoal) return false;
	const bg = profile.background;
	const anyBg = bg.civilian || bg.lawEnforcement || bg.military || bg.medical || bg.other;
	return anyBg;
}

const CLERK_VIRTUAL_PROFILE_TABS = new Set(['security', 'api-keys']);

export const load: PageServerLoad = async ({ locals, platform, url, cookies, params }) => {
	const rest = params?.rest;
	if (rest) {
		const segment = Array.isArray(rest) ? rest.join('/') : rest;
		if (CLERK_VIRTUAL_PROFILE_TABS.has(segment)) {
			redirect(307, `/account${url.search}`);
		}
	}

	const user = requireAuthenticated(locals, '/account');
	const db = getDBFromPlatform(platform);
	const [profile, leaderboardOptIn, accessHistory] = await Promise.all([
		getMemberProfile(db, user.clerkUserId),
		getLeaderboardOptIn(db, user.clerkUserId),
		listMemberEntitlements(db, user.clerkUserId)
	]);

	// Mark first-login surfacing as resolved as soon as the member opens
	// /account so we never re-redirect them, even if they skip filling it.
	cookies.set(_ACCOUNT_SEEN_COOKIE, '1', {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365 * 5
	});

	return {
		user,
		profile,
		leaderboardOptIn,
		accessHistory,
		welcome: url.searchParams.get('welcome') === '1',
		isComplete: _isProfileComplete(profile)
	};
};

export const actions: Actions = {
	save: async ({ request, locals, platform }) => {
		const user = requireAuthenticated(locals, '/account');
		const db = getDBFromPlatform(platform);
		const data = await request.formData();

		const locationCity = readTrimmed(data, 'locationCity', MAX_CITY);
		const stateRawFull =
			typeof data.get('locationState') === 'string'
				? (data.get('locationState') as string).trim()
				: '';
		const locationState = stateRawFull ? stateRawFull.toUpperCase() : null;
		const trainingGoal = readTrimmed(data, 'trainingGoal', MAX_TEXT);
		const otherCourses = readTrimmed(data, 'otherCourses', MAX_LONG_TEXT);
		const carrySetup = readTrimmed(data, 'carrySetup', MAX_TEXT);

		const background = {
			civilian: readChecked(data, 'bg_civilian'),
			lawEnforcement: readChecked(data, 'bg_le'),
			military: readChecked(data, 'bg_military'),
			medical: readChecked(data, 'bg_medical'),
			other: readChecked(data, 'bg_other')
		};
		const ecqcAlumni = readChecked(data, 'ecqcAlumni');
		const mucAlumni = readChecked(data, 'mucAlumni');
		const ewoAlumni = readChecked(data, 'ewoAlumni');
		// Default to opt-in for brand-new profiles when the field is absent
		// (e.g., non-standard client). Only treat as opt-out when an explicit
		// submission omits the checkbox AND the member has saved before.
		const showInFinderRaw = data.has('showInFinder') ? readChecked(data, 'showInFinder') : null;
		const leaderboardOptInChecked = readChecked(data, 'leaderboardOptIn');

		const errors: ProfileFormErrors = {};
		if (locationState && !STATE_REGEX.test(locationState)) {
			errors.locationState = 'Use a two-letter state code (e.g., TX).';
		}
		const anyBackground =
			background.civilian ||
			background.lawEnforcement ||
			background.military ||
			background.medical ||
			background.other;
		if (!locationCity) errors.locationCity = 'City is required.';
		if (!locationState) errors.locationState ??= 'State is required.';
		if (!trainingGoal) errors.trainingGoal = 'Training goal is required.';
		if (!anyBackground) errors.background = 'Select at least one background.';

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				error: 'Please fix the highlighted fields before saving.',
				errors,
				values: {
					locationCity,
					locationState,
					trainingGoal,
					otherCourses,
					carrySetup,
					background,
					ecqcAlumni,
					mucAlumni,
					ewoAlumni,
					showInFinder: showInFinderRaw ?? true,
					leaderboardOptIn: leaderboardOptInChecked
				}
			});
		}

		const previous = await getMemberProfile(db, user.clerkUserId);
		const wasComplete = _isProfileComplete(previous);

		const showInFinder = showInFinderRaw ?? previous?.showInFinder ?? true;

		const candidate: MemberProfileRecord = {
			memberId: user.clerkUserId,
			locationCity,
			locationState,
			background,
			ecqcAlumni,
			mucAlumni,
			ewoAlumni,
			otherCourses,
			carrySetup,
			trainingGoal,
			showInFinder,
			profileCompletedAt: previous?.profileCompletedAt ?? null,
			createdAt: previous?.createdAt ?? Date.now(),
			updatedAt: Date.now()
		};
		const nowComplete = _isProfileComplete(candidate);

		const nextProfile: MemberProfileRecord = await upsertMemberProfile(db, user.clerkUserId, {
			locationCity,
			locationState,
			background,
			ecqcAlumni,
			mucAlumni,
			ewoAlumni,
			otherCourses,
			carrySetup,
			trainingGoal,
			showInFinder,
			profileCompletedAt: previous?.profileCompletedAt ?? (nowComplete ? Date.now() : null)
		});

		try {
			await setLeaderboardOptIn(db, user.clerkUserId, leaderboardOptInChecked);
		} catch (err) {
			console.error('[account] setLeaderboardOptIn failed:', err);
		}

		let awardedTp = 0;
		if (!wasComplete && nowComplete) {
			try {
				const result = await awardPoints(db, {
					memberId: user.clerkUserId,
					action: 'profile_complete'
				});
				if (result.reason === 'awarded') awardedTp = result.awarded;
			} catch (err) {
				console.error('[account] awardPoints(profile_complete) failed:', err);
			}
		}

		return {
			leaderboardOptIn: leaderboardOptInChecked,
			success: _isProfileComplete(nextProfile)
				? awardedTp > 0
					? `Profile saved. +${awardedTp} TP for completing your training profile.`
					: 'Profile saved.'
				: 'Saved. Fill the remaining fields when you are ready to complete your profile.',
			profile: nextProfile
		};
	},

	skip: async ({ cookies }) => {
		cookies.set(_ACCOUNT_SEEN_COOKIE, '1', {
			path: '/',
			httpOnly: false,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365 * 5
		});
		redirect(303, '/dashboard');
	}
};
