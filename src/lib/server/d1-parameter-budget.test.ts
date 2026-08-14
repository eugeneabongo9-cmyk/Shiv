import type { D1Database } from '@cloudflare/workers-types';
import { beforeEach, describe, expect, it } from 'vitest';
import type { D1Compat as D1CompatType } from './d1-compat';

process.env.SHIVWORKS_DB_MODE = 'cloudflare-d1';

const { D1Compat } = await import('./d1-compat');
const { listInactivePaidMembers } = await import('./admin-analytics');
const { listMembersByClerkUserIds, upsertImportedMemberProvisionsBatch } =
	await import('./db/shivworks');

function createBudgetedD1(maxParams = 90): {
	db: D1CompatType;
	bindCounts: number[];
	batchSizes: number[];
} {
	const bindCounts: number[] = [];
	const batchSizes: number[] = [];
	const statement = {
		bind(...params: unknown[]) {
			bindCounts.push(params.length);
			if (params.length > maxParams) {
				throw new Error(`D1 test budget exceeded: ${params.length} parameters`);
			}
			return this;
		},
		async all() {
			return { results: [] };
		},
		async first() {
			return null;
		},
		async run() {
			return { meta: { changes: 0 } };
		}
	};
	const cloudflareDb = {
		prepare() {
			return statement;
		},
		async batch(statements: unknown[]) {
			batchSizes.push(statements.length);
			return statements.map(() => ({ meta: { changes: 1 } }));
		}
	} as unknown as D1Database;

	return { db: new D1Compat(cloudflareDb), bindCounts, batchSizes };
}

describe('Cloudflare D1 parameter budgets', () => {
	beforeEach(() => {
		process.env.SHIVWORKS_DB_MODE = 'cloudflare-d1';
	});

	it('chunks unbounded member ID lists below the reserved 90-parameter budget', async () => {
		const { db, bindCounts } = createBudgetedD1();
		const ids = Array.from({ length: 1_000 }, (_, index) => `member_${index}`);

		await listMembersByClerkUserIds(db, ids);

		expect(bindCounts).toHaveLength(12);
		expect(Math.max(...bindCounts)).toBe(90);
	});

	it('uses fixed parameters for inactive-member analytics regardless of roster size', async () => {
		const { db, bindCounts } = createBudgetedD1();

		await listInactivePaidMembers(db, 14, Date.UTC(2026, 7, 11), 10);

		expect(bindCounts).toEqual([2]);
	});

	it('imports 2,000 purchases in bounded 50-statement D1 batches', async () => {
		const { db, bindCounts, batchSizes } = createBudgetedD1();
		const rows = Array.from({ length: 2_000 }, (_, index) => ({
			email: `buyer${index}@example.com`,
			name: `Buyer ${index}`,
			tier: index % 10 === 0 ? ('vip' as const) : ('bronze' as const),
			accessStatus: 'active' as const,
			role: 'member' as const,
			sourceRef: `wc:${index}`
		}));

		await upsertImportedMemberProvisionsBatch(db, rows);

		expect(batchSizes).toHaveLength(40);
		expect(new Set(batchSizes)).toEqual(new Set([50]));
		expect(Math.max(...bindCounts)).toBe(10);
	});
});
