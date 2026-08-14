import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	getDBFromPlatformMock,
	getMemberNotificationPreferencesMock,
	listActiveMemberSessionsMock,
	requireAuthenticatedMock,
	upsertMemberNotificationPreferencesMock
} = vi.hoisted(() => ({
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	getMemberNotificationPreferencesMock: vi.fn(),
	listActiveMemberSessionsMock: vi.fn(),
	requireAuthenticatedMock: vi.fn(() => ({
		clerkUserId: 'user_123',
		email: 'member@example.com',
		name: 'Member',
		tier: 'free',
		role: 'member',
		accessStatus: 'active',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	})),
	upsertMemberNotificationPreferencesMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/guards', () => ({
	requireAuthenticated: requireAuthenticatedMock
}));

vi.mock('$lib/server/db/shivworks', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/db/shivworks')>(
		'$lib/server/db/shivworks'
	);
	return {
		...actual,
		getMemberNotificationPreferences: getMemberNotificationPreferencesMock,
		listActiveMemberSessions: listActiveMemberSessionsMock,
		upsertMemberNotificationPreferences: upsertMemberNotificationPreferencesMock
	};
});

import { actions, load } from './[...rest]/+page.server';

describe('settings notification actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		getMemberNotificationPreferencesMock.mockResolvedValue({
			memberId: 'user_123',
			buildUpdates: true,
			contentReleaseAlerts: true,
			livestreamReminders: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});
		listActiveMemberSessionsMock.mockResolvedValue([
			{
				sessionId: 'sess_a',
				memberId: 'user_123',
				deviceLabel: 'MacBook Pro',
				userAgent: 'Mozilla/5.0',
				ipAddress: '127.0.0.1',
				createdAt: Date.now(),
				lastActiveAt: Date.now()
			}
		]);
		upsertMemberNotificationPreferencesMock.mockResolvedValue({
			memberId: 'user_123',
			buildUpdates: true,
			contentReleaseAlerts: true,
			livestreamReminders: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});
	});

	it('loads notification preferences and active session count', async () => {
		const result = await load({
			locals: {},
			platform: { env: {} }
		} as never);

		expect(getMemberNotificationPreferencesMock).toHaveBeenCalledWith({ kind: 'db' }, 'user_123');
		expect(listActiveMemberSessionsMock).toHaveBeenCalledWith({ kind: 'db' }, 'user_123');
		expect(result).toMatchObject({
			user: expect.objectContaining({ clerkUserId: 'user_123' }),
			activeSessionCount: 1,
			notificationPreferences: expect.objectContaining({
				buildUpdates: true,
				contentReleaseAlerts: true,
				livestreamReminders: false
			})
		});
	});

	it('persists all notification toggles including content release alerts', async () => {
		const formData = new FormData();
		formData.set('buildUpdates', 'on');
		formData.set('contentReleaseAlerts', 'on');

		const result = await actions.updateNotifications({
			request: { formData: async () => formData },
			locals: {},
			platform: { env: {} }
		} as never);

		expect(upsertMemberNotificationPreferencesMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			'user_123',
			{
				buildUpdates: true,
				contentReleaseAlerts: true,
				livestreamReminders: false
			}
		);
		expect(result).toMatchObject({ success: 'Notification preferences saved.' });
	});
});
