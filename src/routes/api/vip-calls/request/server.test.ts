import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createVipCallRequestMock, getDBFromPlatformMock } = vi.hoisted(() => ({
	createVipCallRequestMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' }))
}));

vi.mock('$lib/server/db/shivworks', () => ({
	createVipCallRequest: createVipCallRequestMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/rate-limit', () => ({
	checkRateLimit: vi.fn(async () => ({
		allowed: true,
		remaining: 5,
		retryAfterSeconds: 0,
		requestCount: 1
	}))
}));

import { POST } from './+server';

function createVipUser(
	overrides: Partial<NonNullable<App.Locals['user']>> = {}
): NonNullable<App.Locals['user']> {
	return {
		clerkUserId: 'user_123',
		email: 'vip@example.com',
		name: 'VIP Member',
		tier: 'vip',
		role: 'member',
		accessStatus: 'active',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

describe('POST /api/vip-calls/request', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
	});

	it('requires active member access', async () => {
		const response = await POST({
			request: new Request('https://network.shivworks.com/api/vip-calls/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ goals: 'Walk through recent training questions' })
			}),
			locals: { user: null },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			success: false,
			error: 'Member access required'
		});
	});

	it('rejects duplicate open VIP requests', async () => {
		createVipCallRequestMock.mockResolvedValue(false);

		const response = await POST({
			request: new Request('https://network.shivworks.com/api/vip-calls/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					goals: 'Talk through current priorities',
					preferredMonth: 'June 2026'
				})
			}),
			locals: {
				user: createVipUser()
			},
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({
			success: false
		});
	});

	it('creates a VIP request for eligible members', async () => {
		createVipCallRequestMock.mockResolvedValue(true);

		const response = await POST({
			request: new Request('https://network.shivworks.com/api/vip-calls/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					goals: ' Talk through current priorities ',
					preferredMonth: ' June 2026 ',
					notes: ' Focus on upcoming live blocks '
				})
			}),
			locals: {
				user: createVipUser()
			},
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(200);
		expect(createVipCallRequestMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			'user_123',
			'Talk through current priorities',
			'June 2026',
			'Focus on upcoming live blocks'
		);
		expect(await response.json()).toMatchObject({ success: true });
	});
});
