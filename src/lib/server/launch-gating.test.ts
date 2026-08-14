import { describe, expect, it } from 'vitest';
import { isLaunchGated } from './launch-gating';

describe('isLaunchGated', () => {
	it('lets viewers through to the real library page', () => {
		expect(isLaunchGated('/library', null)).toBeNull();
		expect(isLaunchGated('/library', { role: 'member', tier: 'free' })).toBeNull();
		expect(isLaunchGated('/library', { role: 'member', tier: 'bronze' })).toBeNull();
		expect(isLaunchGated('/library/origin-story', { role: 'member', tier: 'vip' })).toBeNull();
		expect(isLaunchGated('/library', { role: 'admin', tier: 'free' })).toBeNull();
	});

	it('keeps deferred routes gated for paid non-admin viewers', () => {
		expect(isLaunchGated('/updates', { role: 'member', tier: 'bronze' })?.surface).toBe('updates');
		expect(isLaunchGated('/updates', { role: 'member', tier: 'bronze' })?.trackerMode).toBe(
			'drops'
		);
		expect(isLaunchGated('/messages', { role: 'member', tier: 'bronze' })?.name).toBe(
			'Coming Soon'
		);
		expect(isLaunchGated('/leaderboard', { role: 'member', tier: 'bronze' })?.name).toBe(
			'Coming Soon'
		);
	});

	it('lets authenticated members into Settings and Live', () => {
		expect(isLaunchGated('/settings', { role: 'member', tier: 'bronze' })).toBeNull();
		expect(isLaunchGated('/live', { role: 'member', tier: 'bronze' })).toBeNull();
	});

	// Re-gated 2026-08-13 on the owner's instruction. Both were un-gated on
	// 2026-07-29/30 without sign-off, exposing unapproved sections to paying
	// members. This test exists so re-opening either is a deliberate act.
	it('hides Community and VIP calls from every member tier', () => {
		for (const tier of ['free', 'bronze', 'vip'] as const) {
			expect(isLaunchGated('/community', { role: 'member', tier })).not.toBeNull();
			expect(isLaunchGated('/vip-calls', { role: 'member', tier })).not.toBeNull();
		}
	});

	it('still lets admins preview Community and VIP calls', () => {
		expect(isLaunchGated('/community', { role: 'admin', tier: 'vip' })).toBeNull();
		expect(isLaunchGated('/vip-calls', { role: 'admin', tier: 'vip' })).toBeNull();
	});
});
