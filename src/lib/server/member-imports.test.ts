import { describe, expect, it } from 'vitest';
import { normalizeImportedTier, parseImportedMemberCsv } from './member-imports';

describe('normalizeImportedTier', () => {
	it('maps known tier strings and product names', () => {
		expect(normalizeImportedTier('VIP Founding Member')).toBe('vip');
		expect(normalizeImportedTier('Bronze Founding Member')).toBe('bronze');
		expect(normalizeImportedTier('free access')).toBe('free');
		expect(normalizeImportedTier('')).toBeNull();
	});
});

describe('parseImportedMemberCsv', () => {
	it('parses common purchaser export columns', () => {
		const result = parseImportedMemberCsv(`email,first_name,last_name,product,order_id
member@example.com,Craig,Douglas,VIP Founding Member,1001
bronze@example.com,Student,One,Bronze Founding Member,1002`);

		expect(result.errors).toEqual([]);
		expect(result.rows).toEqual([
			{
				email: 'member@example.com',
				name: 'Craig Douglas',
				tier: 'vip',
				accessStatus: 'active',
				role: 'member',
				sourceRef: 'wc:1001'
			},
			{
				email: 'bronze@example.com',
				name: 'Student One',
				tier: 'bronze',
				accessStatus: 'active',
				role: 'member',
				sourceRef: 'wc:1002'
			}
		]);
	});

	it('parses WooCommerce founding-member export with Package column', () => {
		const result =
			parseImportedMemberCsv(`Order ID,Customer Name,Email,Package,Order Total,Status,Date
35127,Skye Middleton,skye@example.com,Bronze,263.95,Processing,"Jun 7, 2026 8:44pm"
35069,Tony Radle,vip@example.com,VIP,614.95,Completed,"Jun 4, 2026 7:46pm"`);

		expect(result.errors).toEqual([]);
		expect(result.rows).toEqual([
			{
				email: 'skye@example.com',
				name: 'Skye Middleton',
				tier: 'bronze',
				accessStatus: 'active',
				role: 'member',
				sourceRef: 'wc:35127'
			},
			{
				email: 'vip@example.com',
				name: 'Tony Radle',
				tier: 'vip',
				accessStatus: 'active',
				role: 'member',
				sourceRef: 'wc:35069'
			}
		]);
	});

	it('reports duplicate or invalid rows', () => {
		const result = parseImportedMemberCsv(`email,tier
invalid,bronze
member@example.com,vip
member@example.com,bronze`);

		expect(result.rows).toHaveLength(1);
		expect(result.errors).toEqual([
			'Row 2: valid email is required.',
			'Row 4: duplicate email member@example.com.'
		]);
	});

	it('never accepts admin role elevation from CSV data', () => {
		const result = parseImportedMemberCsv(`email,tier,role
member@example.com,vip,admin`);

		expect(result.errors).toEqual([]);
		expect(result.rows).toEqual([
			expect.objectContaining({
				email: 'member@example.com',
				role: 'member'
			})
		]);
	});

	it('parses a 2,000-row purchase queue without truncating or creating invalid roles', () => {
		const rows = Array.from(
			{ length: 2_000 },
			(_, index) =>
				`${10_000 + index},Buyer ${index},buyer${index}@example.com,${
					index % 8 === 0 ? 'VIP' : 'Bronze'
				},admin`
		);
		const result = parseImportedMemberCsv(
			['Order ID,Customer Name,Email,Package,Role', ...rows].join('\n')
		);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2_000);
		expect(result.rows[0]).toMatchObject({
			email: 'buyer0@example.com',
			tier: 'vip',
			role: 'member',
			sourceRef: 'wc:10000'
		});
		expect(result.rows.at(-1)).toMatchObject({
			email: 'buyer1999@example.com',
			tier: 'bronze',
			role: 'member',
			sourceRef: 'wc:11999'
		});
	});
});
