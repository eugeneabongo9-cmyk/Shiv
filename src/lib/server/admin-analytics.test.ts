import { describe, expect, it, vi } from 'vitest';
import { countEngagementWindows, getClaimedSignupCountsSince } from './admin-analytics';

describe('admin analytics v1', () => {
	it('counts DAU, WAU, and MAU from last-active timestamps', () => {
		const now = Date.UTC(2026, 5, 15, 12, 0, 0);
		const day = 24 * 60 * 60 * 1000;

		const result = countEngagementWindows(
			[
				{ id: 'a', lastActive: now - day * 0.5 },
				{ id: 'b', lastActive: now - day * 3 },
				{ id: 'c', lastActive: now - day * 20 },
				{ id: 'd', lastActive: 0 }
			],
			4,
			now
		);

		expect(result).toEqual({
			dau: 1,
			wau: 2,
			mau: 3,
			dauPct: 25,
			wauPct: 50
		});
	});

	it('returns date-scoped Bronze and VIP claimed signups', async () => {
		const bind = vi.fn(() => ({
			first: vi.fn(async () => ({ bronze_count: 6, vip_count: 3 }))
		}));
		const prepare = vi.fn(() => ({ bind }));

		const result = await getClaimedSignupCountsSince({ prepare } as never, 123_456);

		expect(bind).toHaveBeenCalledWith(123_456);
		expect(result).toEqual({ bronze: 6, vip: 3 });
	});
});
