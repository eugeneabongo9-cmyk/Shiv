import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	getMemberNotificationPreferences,
	listActiveMemberSessions,
	upsertMemberNotificationPreferences
} from '$lib/server/db/shivworks';
import { requireAuthenticated } from '$lib/server/guards';

function readChecked(data: FormData, key: string): boolean {
	return data.get(key) !== null;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireAuthenticated(locals, '/settings');
	const db = getDBFromPlatform(platform);
	const sessions = await listActiveMemberSessions(db, user.clerkUserId);

	return {
		user,
		notificationPreferences: await getMemberNotificationPreferences(db, user.clerkUserId),
		activeSessionCount: sessions.length
	};
};

export const actions: Actions = {
	updateNotifications: async ({ request, locals, platform }) => {
		const user = requireAuthenticated(locals, '/settings');
		const db = getDBFromPlatform(platform);
		const data = await request.formData();

		const preferences = await upsertMemberNotificationPreferences(db, user.clerkUserId, {
			buildUpdates: readChecked(data, 'buildUpdates'),
			contentReleaseAlerts: readChecked(data, 'contentReleaseAlerts'),
			livestreamReminders: readChecked(data, 'livestreamReminders')
		});

		if (!preferences) {
			return fail(400, { error: 'Unable to save notification preferences.' });
		}

		return { success: 'Notification preferences saved.' };
	}
};
