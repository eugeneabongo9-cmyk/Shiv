export interface MemberNotificationPreferences {
	buildUpdates: boolean;
	contentReleaseAlerts: boolean;
	livestreamReminders: boolean;
}

export const DEFAULT_MEMBER_NOTIFICATION_PREFERENCES: MemberNotificationPreferences = {
	buildUpdates: true,
	contentReleaseAlerts: true,
	livestreamReminders: true
};
