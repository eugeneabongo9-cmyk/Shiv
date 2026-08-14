import { describe, expect, it, vi } from 'vitest';
import {
	getFoundingMemberActiveCounts,
	getFoundingMemberPurchaseCounts,
	getFoundingMemberTrackerCounts
} from './member-counts';

function mockDb(rows: { tier: string; count: number }[]) {
	return {
		prepare: vi.fn(() => ({
			all: vi.fn(async () => ({ results: rows }))
		}))
	};
}

describe('founding member counts', () => {
	it('counts purchases from member_imports', async () => {
		const db = mockDb([
			{ tier: 'bronze', count: 612 },
			{ tier: 'vip', count: 91 }
		]);

		await expect(getFoundingMemberPurchaseCounts(db as never)).resolves.toEqual({
			bronze: 612,
			vip: 91,
			total: 703
		});
	});

	it('uses purchase counts for the public tracker when higher than active members', async () => {
		let call = 0;
		const db = {
			prepare: vi.fn(() => ({
				all: vi.fn(async () => {
					call += 1;
					if (call === 1) {
						return {
							results: [
								{ tier: 'bronze', count: 600 },
								{ tier: 'vip', count: 90 }
							]
						};
					}
					return {
						results: [
							{ tier: 'bronze', count: 580 },
							{ tier: 'vip', count: 88 }
						]
					};
				})
			}))
		};

		await expect(getFoundingMemberTrackerCounts(db as never)).resolves.toEqual({
			bronze: 600,
			vip: 90,
			total: 690
		});
	});

	it('falls back to active member counts when imports are missing', async () => {
		let call = 0;
		const db = {
			prepare: vi.fn(() => ({
				all: vi.fn(async () => {
					call += 1;
					if (call === 1) {
						return { results: [] };
					}
					return { results: [{ tier: 'vip', count: 2 }] };
				})
			}))
		};

		await expect(getFoundingMemberTrackerCounts(db as never)).resolves.toEqual({
			bronze: 0,
			vip: 2,
			total: 2
		});
	});

	it('counts active paid members separately', async () => {
		const db = mockDb([{ tier: 'bronze', count: 4 }]);

		await expect(getFoundingMemberActiveCounts(db as never)).resolves.toEqual({
			bronze: 4,
			vip: 0,
			total: 4
		});
	});
});
