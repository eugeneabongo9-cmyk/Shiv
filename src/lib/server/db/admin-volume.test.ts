import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const MEMBER_COUNT = 1_300;
const IMPORT_COUNT = 1_900;
const dbPath = join(tmpdir(), `shivworks-admin-volume-${Date.now()}-${process.pid}.db`);

process.env.SHIVWORKS_DB_MODE = 'sqlite';
process.env.DATABASE_PATH = dbPath;

const { getDB } = await import('$lib/server/d1-compat');
const { listInactivePaidMembers } = await import('$lib/server/admin-analytics');
const {
	getAdminSummaryCounts,
	listAdminMembers,
	listImportedMemberProvisions,
	listMembersByClerkUserIds
} = await import('./shivworks');
const { actions: adminActions, load: adminPageLoad } =
	await import('../../../routes/admin/+page.server');
const { load: adminLayoutLoad } = await import('../../../routes/admin/+layout.server');

const db = getDB();
const oldTimestamp = Date.UTC(2025, 0, 1);

function chunkedValues(
	total: number,
	buildRow: (index: number) => string,
	chunkSize = 200
): string[] {
	const statements: string[] = [];
	for (let start = 0; start < total; start += chunkSize) {
		const rows: string[] = [];
		for (let index = start; index < Math.min(total, start + chunkSize); index += 1) {
			rows.push(buildRow(index));
		}
		statements.push(rows.join(',\n'));
	}
	return statements;
}

beforeAll(async () => {
	await db.prepare('SELECT 1').first();

	for (const values of chunkedValues(
		MEMBER_COUNT,
		(index) =>
			`('volume_member_${index}', 'member${index}@example.com', 'Member ${index}', '${
				index % 5 === 0 ? 'vip' : 'bronze'
			}', 'active', 'member', 1, ${oldTimestamp}, ${oldTimestamp})`
	)) {
		await db.exec(
			`INSERT INTO members (
				clerk_user_id, email, name, tier, access_status, role,
				email_verified, created_at, updated_at
			) VALUES ${values}`
		);
	}

	for (const values of chunkedValues(
		IMPORT_COUNT,
		(index) =>
			`('volume_import_${index}', 'buyer${index}@example.com', 'Buyer ${index}', '${
				index % 7 === 0 ? 'vip' : 'bronze'
			}', 'active', 'member', 'volume:${index}', NULL, NULL, NULL, NULL, ${oldTimestamp}, ${oldTimestamp})`
	)) {
		await db.exec(
			`INSERT INTO member_imports (
				id, email, name, tier, access_status, role, source_ref,
				invited_at, last_emailed_at, claimed_member_id, claimed_at,
				created_at, updated_at
			) VALUES ${values}`
		);
	}
}, 30_000);

afterAll(() => {
	for (const suffix of ['', '-wal', '-shm']) {
		try {
			if (existsSync(`${dbPath}${suffix}`)) rmSync(`${dbPath}${suffix}`);
		} catch {
			// The process owns a short-lived better-sqlite3 handle.
		}
	}
});

describe('admin queries at more than twice the current production volume', () => {
	it('loads the actual admin page and layout with the full datasets', async () => {
		const locals = {
			auth: { isAuthenticated: true },
			user: {
				clerkUserId: 'volume_admin',
				email: 'admin@example.com',
				name: 'Admin',
				tier: 'vip',
				accessStatus: 'active',
				role: 'admin'
			}
		};
		const event = { locals, platform: undefined } as never;
		const pageResult = await (adminPageLoad as (event: never) => Promise<Record<string, unknown>>)(
			event
		);
		const layoutResult = await (
			adminLayoutLoad as (event: never) => Promise<Record<string, unknown>>
		)(event);

		expect(pageResult.members).toHaveLength(MEMBER_COUNT);
		expect(pageResult.imports).toHaveLength(IMPORT_COUNT);
		expect(pageResult.importStats).toMatchObject({ total: IMPORT_COUNT });
		expect(layoutResult.adminSummary).toMatchObject({ memberTotal: MEMBER_COUNT });
	});

	it('loads members, imports, and SQL summary counts', async () => {
		const [members, imports, summary] = await Promise.all([
			listAdminMembers(db),
			listImportedMemberProvisions(db),
			getAdminSummaryCounts(db)
		]);

		expect(members).toHaveLength(MEMBER_COUNT);
		expect(imports).toHaveLength(IMPORT_COUNT);
		expect(summary.memberTotal).toBe(MEMBER_COUNT);
		expect(summary.lessonTotal).toBeGreaterThanOrEqual(
			summary.lessonPublished + summary.lessonDraft
		);
	});

	it('lists more than 100 inactive paid members without a dynamic IN clause', async () => {
		const now = Date.UTC(2026, 7, 11);
		const result = await listInactivePaidMembers(db, 14, now, 10);

		expect(result.total).toBe(MEMBER_COUNT);
		expect(result.members).toHaveLength(10);
		expect(result.members.every((member) => member.daysInactive > 14)).toBe(true);
	});

	it('chunks a 1,000-member lookup below D1 parameter limits and preserves input order', async () => {
		const ids = Array.from({ length: 1_000 }, (_, index) => `volume_member_${999 - index}`);
		const members = await listMembersByClerkUserIds(db, ids);

		expect(members).toHaveLength(1_000);
		expect(members.map((member) => member.clerkUserId)).toEqual(ids);
	});

	it('runs the real admin CSV action for 2,000 purchases in bounded batches', async () => {
		const csvRows = Array.from(
			{ length: 2_000 },
			(_, index) =>
				`${20_000 + index},CSV Buyer ${index},csvbuyer${index}@example.com,${
					index % 8 === 0 ? 'VIP' : 'Bronze'
				}`
		);
		const formData = new FormData();
		formData.set('csvData', ['Order ID,Customer Name,Email,Package', ...csvRows].join('\n'));
		const request = new Request('http://localhost/admin?/importMembers', {
			method: 'POST',
			body: formData
		});
		const result = await adminActions.importMembers({
			request,
			locals: {
				auth: { isAuthenticated: true },
				user: {
					clerkUserId: 'volume_admin',
					email: 'admin@example.com',
					name: 'Admin',
					tier: 'vip',
					accessStatus: 'active',
					role: 'admin'
				}
			},
			platform: undefined
		} as never);

		expect(result).toMatchObject({
			success: expect.stringContaining('2000 members imported')
		});
		const row = await db
			.prepare(
				"SELECT COUNT(*) AS total FROM member_imports WHERE email LIKE 'csvbuyer%@example.com'"
			)
			.first<{ total: number | string }>();
		expect(Number(row?.total ?? 0)).toBe(2_000);
	}, 30_000);
});
