import { beforeEach, describe, expect, it, vi } from 'vitest';

const { bustMock } = vi.hoisted(() => ({
	bustMock: vi.fn()
}));

vi.mock('$lib/server/kv-cache', () => ({
	bust: bustMock
}));

import { revokePaidAccessFromWcOrder } from './db/shivworks';

type Row = Record<string, unknown>;

function createRevokeMockDb(seed: {
	importRow?: Row | null;
	memberRow?: Row | null;
	entitlements?: Row[];
}) {
	const imports = new Map<string, Row>();
	const members = new Map<string, Row>();
	const entitlements = [...(seed.entitlements ?? [])];

	if (seed.importRow) {
		imports.set(String(seed.importRow.email).toLowerCase(), seed.importRow);
	}
	if (seed.memberRow) {
		members.set(String(seed.memberRow.clerk_user_id), seed.memberRow);
		members.set(`email:${String(seed.memberRow.email).toLowerCase()}`, seed.memberRow);
	}

	const db = {
		prepare(sql: string) {
			return {
				params: [] as unknown[],
				bind(...args: unknown[]) {
					this.params = args;
					return this;
				},
				async first<T>() {
					if (sql.includes('FROM member_imports')) {
						const email = String(this.params[0]).toLowerCase();
						return (imports.get(email) as T) ?? null;
					}
					if (sql.includes('FROM members WHERE lower(email)')) {
						const email = String(this.params[0]).toLowerCase();
						return (members.get(`email:${email}`) as T) ?? null;
					}
					if (sql.includes('FROM members WHERE clerk_user_id')) {
						return (members.get(String(this.params[0])) as T) ?? null;
					}
					return null;
				},
				async all<T>() {
					if (sql.includes('FROM member_entitlements') && sql.includes("status = 'active'")) {
						const memberId = String(this.params[0]);
						const rows = entitlements
							.filter((row) => row.member_id === memberId && row.status === 'active')
							.sort((a, b) => {
								const rank = (tier: unknown) => (tier === 'vip' ? 2 : tier === 'bronze' ? 1 : 0);
								return rank(b.tier) - rank(a.tier);
							});
						return { results: rows as T[] };
					}
					return { results: [] as T[] };
				},
				async run() {
					if (sql.includes('UPDATE member_imports')) {
						const [sourceRef, , id] = this.params;
						for (const [key, row] of imports) {
							if (row.id === id) {
								imports.set(key, {
									...row,
									access_status: 'revoked',
									source_ref: row.source_ref ?? sourceRef,
									updated_at: Date.now()
								});
							}
						}
						return { meta: { changes: 1 } };
					}
					if (sql.includes('UPDATE member_entitlements')) {
						const [, memberId, sourceRef] = this.params;
						for (const row of entitlements) {
							if (
								row.member_id === memberId &&
								row.source_ref === sourceRef &&
								row.status === 'active'
							) {
								row.status = 'revoked';
								row.updated_at = Date.now();
							}
						}
						return { meta: { changes: 1 } };
					}
					if (sql.includes('UPDATE members SET tier')) {
						const [tier, accessStatus, , memberId] = this.params;
						const existing = members.get(String(memberId));
						if (existing) {
							const next = {
								...existing,
								tier,
								access_status: accessStatus,
								updated_at: Date.now()
							};
							members.set(String(memberId), next);
							members.set(`email:${String(existing.email).toLowerCase()}`, next);
						}
						return { meta: { changes: 1 } };
					}
					return { meta: { changes: 0 } };
				}
			};
		}
	};

	return { db, imports, members, entitlements };
}

describe('revokePaidAccessFromWcOrder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('revokes import and claimed member for a refunded founding order', async () => {
		const { db, members } = createRevokeMockDb({
			importRow: {
				id: 'import_1',
				email: 'buyer@example.com',
				name: 'Buyer',
				tier: 'bronze',
				access_status: 'active',
				role: 'member',
				source_ref: 'wc:4242',
				invited_at: null,
				last_emailed_at: null,
				claimed_member_id: 'user_1',
				claimed_at: Date.now(),
				created_at: Date.now(),
				updated_at: Date.now()
			},
			memberRow: {
				clerk_user_id: 'user_1',
				email: 'buyer@example.com',
				name: 'Buyer',
				tier: 'bronze',
				access_status: 'active',
				role: 'member',
				email_verified: 1,
				created_at: Date.now(),
				updated_at: Date.now()
			},
			entitlements: [
				{
					id: 'ent_1',
					member_id: 'user_1',
					tier: 'bronze',
					source_type: 'import',
					source_ref: 'import_1',
					status: 'active'
				}
			]
		});

		const result = await revokePaidAccessFromWcOrder(
			db as never,
			{ email: 'buyer@example.com', orderId: 4242, reason: 'wc_refunded' },
			{ delete: vi.fn() } as never
		);

		expect(result).toMatchObject({
			importUpdated: true,
			memberId: 'user_1',
			remainingActiveEntitlements: 0,
			accessStatus: 'revoked'
		});
		expect(members.get('user_1')?.access_status).toBe('revoked');
		expect(bustMock).toHaveBeenCalledWith(expect.anything(), 'member:user_1', 'courses:user_1');
	});

	it('keeps access when another active entitlement remains', async () => {
		const { db, members } = createRevokeMockDb({
			importRow: {
				id: 'import_1',
				email: 'buyer@example.com',
				name: 'Buyer',
				tier: 'bronze',
				access_status: 'active',
				role: 'member',
				source_ref: 'wc:4242',
				invited_at: null,
				last_emailed_at: null,
				claimed_member_id: 'user_1',
				claimed_at: Date.now(),
				created_at: Date.now(),
				updated_at: Date.now()
			},
			memberRow: {
				clerk_user_id: 'user_1',
				email: 'buyer@example.com',
				name: 'Buyer',
				tier: 'vip',
				access_status: 'active',
				role: 'member',
				email_verified: 1,
				created_at: Date.now(),
				updated_at: Date.now()
			},
			entitlements: [
				{
					id: 'ent_1',
					member_id: 'user_1',
					tier: 'bronze',
					source_type: 'import',
					source_ref: 'import_1',
					status: 'active'
				},
				{
					id: 'ent_2',
					member_id: 'user_1',
					tier: 'vip',
					source_type: 'admin',
					source_ref: 'admin:vip',
					status: 'active'
				}
			]
		});

		const result = await revokePaidAccessFromWcOrder(db as never, {
			email: 'buyer@example.com',
			orderId: 4242,
			reason: 'wc_cancelled'
		});

		expect(result.remainingActiveEntitlements).toBe(1);
		expect(result.accessStatus).toBe('active');
		expect(result.tier).toBe('vip');
		expect(members.get('user_1')?.access_status).toBe('active');
		expect(members.get('user_1')?.tier).toBe('vip');
	});
});
