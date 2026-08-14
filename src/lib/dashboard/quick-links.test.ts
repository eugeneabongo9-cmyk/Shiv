import { describe, expect, it } from 'vitest';
import { buildDashboardQuickLinks } from './quick-links';
import type { MemberRecord } from '$lib/server/db/shivworks';

const member = (overrides: Partial<MemberRecord> = {}): MemberRecord => ({
	clerkUserId: 'user_1',
	email: 'member@example.com',
	name: 'Member',
	tier: 'free',
	accessStatus: 'active',
	role: 'member',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides
});

describe('buildDashboardQuickLinks', () => {
	it('prioritizes upgrade for free members', () => {
		const links = buildDashboardQuickLinks(member());
		expect(links[0]).toMatchObject({ kind: 'upgrade', href: '/checkout', emphasis: true });
	});

	it('includes library, account, and settings for bronze members', () => {
		const links = buildDashboardQuickLinks(member({ tier: 'bronze' }));
		expect(links.some((link) => link.kind === 'library' && link.href === '/library')).toBe(true);
		expect(links.some((link) => link.kind === 'account' && link.href === '/account')).toBe(true);
		expect(links.some((link) => link.kind === 'settings' && link.href === '/settings')).toBe(true);
		expect(links.some((link) => link.kind === 'upgrade')).toBe(false);
		expect(links.some((link) => link.href === '/community' || link.href === '/live')).toBe(false);
	});

	it('includes VIP Lounge for VIP members', () => {
		const links = buildDashboardQuickLinks(member({ tier: 'vip' }));
		expect(links.some((link) => link.kind === 'vip' && link.href === '/vip-calls')).toBe(true);
	});

	it('includes admin panel for admins', () => {
		const links = buildDashboardQuickLinks(member({ role: 'admin', tier: 'vip' }));
		expect(links.some((link) => link.kind === 'admin' && link.href === '/admin')).toBe(true);
	});

	it('routes revoked members to welcome recovery', () => {
		const links = buildDashboardQuickLinks(member({ tier: 'bronze', accessStatus: 'revoked' }));
		expect(links[0]).toMatchObject({
			kind: 'welcome',
			href: '/welcome?access=revoked'
		});
	});
});
