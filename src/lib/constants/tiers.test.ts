import { describe, expect, it } from 'vitest';
import { canAccessAudience, normalizeContentAudience } from './tiers';

describe('content audience access', () => {
	it('maps legacy all-member scopes into paid-member scope', () => {
		expect(normalizeContentAudience('all')).toBe('member');
		expect(normalizeContentAudience('member')).toBe('member');
		expect(normalizeContentAudience('free')).toBe('free');
		expect(normalizeContentAudience('vip')).toBe('vip');
	});

	it('allows free users only into free access content', () => {
		const freeUser = { tier: 'free' as const, role: 'member' as const };

		expect(canAccessAudience(freeUser, 'free')).toBe(true);
		expect(canAccessAudience(freeUser, 'member')).toBe(false);
		expect(canAccessAudience(freeUser, 'vip')).toBe(false);
	});

	it('allows paid members into all curriculum content and admins into all content', () => {
		const bronzeUser = { tier: 'bronze' as const, role: 'member' as const };
		const vipUser = { tier: 'vip' as const, role: 'member' as const };
		const adminUser = { tier: 'free' as const, role: 'admin' as const };

		expect(canAccessAudience(bronzeUser, 'free')).toBe(true);
		expect(canAccessAudience(bronzeUser, 'member')).toBe(true);
		expect(canAccessAudience(bronzeUser, 'vip')).toBe(true);
		expect(canAccessAudience(vipUser, 'vip')).toBe(true);
		expect(canAccessAudience(adminUser, 'vip')).toBe(true);
	});
});
