import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDBFromPlatformMock, nudgeAwaitingSignupImportsMock, resolveRuntimeEnvMock } = vi.hoisted(
	() => ({
		getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
		nudgeAwaitingSignupImportsMock: vi.fn(),
		resolveRuntimeEnvMock: vi.fn(() => ({ RESEND_API_KEY: 'test' }))
	})
);

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/guards', () => ({
	requireAdmin: vi.fn()
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: resolveRuntimeEnvMock
}));

vi.mock('$lib/server/import-onboarding-nudge', () => ({
	nudgeAwaitingSignupImports: nudgeAwaitingSignupImportsMock
}));

import { actions } from './+page.server';

describe('admin analytics bulk re-nudge action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
	});

	it('rejects an unconfirmed bulk send', async () => {
		const result = await actions.nudgeAwaitingSignups({
			request: { formData: async () => new FormData() },
			locals: { user: { role: 'admin' } },
			platform: { env: {} }
		} as never);

		expect(nudgeAwaitingSignupImportsMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			status: 400,
			data: { error: expect.stringContaining('confirm') }
		});
	});

	it('sends after explicit confirmation', async () => {
		nudgeAwaitingSignupImportsMock.mockResolvedValue({
			sent: 4,
			skippedClaimed: 1,
			skippedCooldown: 2,
			skippedInactive: 1,
			failed: 0,
			failures: []
		});
		const formData = new FormData();
		formData.set('confirmBulkNudge', 'confirm');

		const result = await actions.nudgeAwaitingSignups({
			request: { formData: async () => formData },
			locals: { user: { role: 'admin' } },
			platform: { env: {} }
		} as never);

		expect(nudgeAwaitingSignupImportsMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({ RESEND_API_KEY: 'test' })
		);
		expect(result).toMatchObject({ success: expect.stringContaining('Sent 4') });
	});
});
