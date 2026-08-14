export type MembershipTier = 'free' | 'bronze' | 'vip';
export type PaidMembershipTier = Exclude<MembershipTier, 'free'>;
export type AccessStatus = 'none' | 'active' | 'revoked';
export type ContentAudience = 'free' | 'member' | 'vip';

export const MEMBERSHIP_TIERS = {
	free: {
		code: 'free' as const,
		label: 'Preview Access',
		badge: 'Preview',
		displayPrice: '$0',
		checkoutLabel: 'Preview access',
		description:
			'Preview the ShivWorks Network through selected roadmap items, member updates, and scheduled touchpoints before full access is activated.',
		highlights: ['Roadmap previews', 'Selected build-log updates', 'Scheduled touchpoints']
	},
	bronze: {
		code: 'bronze' as const,
		label: 'Bronze Founding Member',
		badge: 'Bronze',
		displayPrice: '$199-$399',
		checkoutLabel: 'Founding member access',
		description:
			'Full network access to courses, community, livestreams, updates, and the full ShivWorks curriculum as it is released.',
		highlights: [
			'10+ complete training courses',
			'Bi-monthly livestreams with Craig',
			'Private community access',
			'Training knife',
			'20% off in-person courses',
			'25% off ShivWorks cutlery',
			'All future content included'
		]
	},
	vip: {
		code: 'vip' as const,
		label: 'VIP Founding Member',
		badge: 'VIP',
		displayPrice: '$599',
		checkoutLabel: 'VIP founding access',
		description:
			'Everything in Bronze, plus a visible VIP distinction, priority booking callouts, and in-product quarterly VIP call requests.',
		highlights: [
			'Everything in Bronze, plus:',
			'Ticket to ShivWorks Games',
			'4-hour in-person MUC block',
			'4 Zoom calls with Craig over 2 years',
			'Clinch Pick Knife ($180 value)',
			'Priority in-person booking',
			'VIP community badge'
		]
	}
} satisfies Record<
	MembershipTier,
	{
		code: MembershipTier;
		label: string;
		badge: string;
		displayPrice: string;
		checkoutLabel: string;
		description: string;
		highlights: string[];
	}
>;

export const PAID_MEMBERSHIP_TIERS = [
	'bronze',
	'vip'
] as const satisfies readonly PaidMembershipTier[];

export function isMemberTier(value: unknown): value is MembershipTier {
	return value === 'free' || value === 'bronze' || value === 'vip';
}

export function isPaidMembershipTier(value: unknown): value is PaidMembershipTier {
	return value === 'bronze' || value === 'vip';
}

export function normalizeContentAudience(value: unknown): ContentAudience {
	if (value === 'free') {
		return 'free';
	}

	if (value === 'vip') {
		return 'vip';
	}

	return 'member';
}

export function isPaidMemberTier(
	value: MembershipTier | null | undefined
): value is PaidMembershipTier {
	return value === 'bronze' || value === 'vip';
}

export function canAccessAudience(
	member:
		| {
				tier: MembershipTier | null;
				role?: 'member' | 'admin';
		  }
		| null
		| undefined,
	audience: ContentAudience
): boolean {
	if (member?.role === 'admin') {
		return true;
	}

	switch (audience) {
		case 'free':
			return member?.tier === 'free' || member?.tier === 'bronze' || member?.tier === 'vip';
		case 'member':
		case 'vip':
			return member?.tier === 'bronze' || member?.tier === 'vip';
		default:
			return false;
	}
}

export function getAudienceLabel(audience: ContentAudience): string {
	switch (audience) {
		case 'free':
			return 'Preview access';
		case 'member':
		case 'vip':
			return 'Bronze or VIP';
		default:
			return 'Founding members';
	}
}
