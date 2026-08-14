import type { MemberRecord } from '$lib/server/db/shivworks';

export type DashboardQuickLinkKind =
	| 'library'
	| 'account'
	| 'settings'
	| 'vip'
	| 'upgrade'
	| 'admin'
	| 'welcome';

export type DashboardQuickLink = {
	href: string;
	title: string;
	copy: string;
	kind: DashboardQuickLinkKind;
	emphasis: boolean;
};

export function buildDashboardQuickLinks(user: MemberRecord): DashboardQuickLink[] {
	const links: DashboardQuickLink[] = [];
	const isFree = user.tier === 'free';
	const isVip = user.tier === 'vip';
	const isAdmin = user.role === 'admin';
	const isPaid = !isFree && user.tier !== null;
	const isRevoked = user.accessStatus === 'revoked';

	if (isRevoked) {
		links.push({
			href: '/welcome?access=revoked',
			title: 'Access status',
			copy: 'Review why membership is inactive and contact support if needed.',
			kind: 'welcome',
			emphasis: true
		});
	} else if (isFree) {
		links.push({
			href: '/checkout',
			title: 'Upgrade access',
			copy: 'Unlock the full curriculum and paid member lanes.',
			kind: 'upgrade',
			emphasis: true
		});
	}

	links.push(
		{
			href: '/library',
			title: 'Library',
			copy: 'Open the curriculum lane and watch live modules.',
			kind: 'library',
			emphasis: isPaid && !isVip
		},
		{
			href: '/account',
			title: 'Account',
			copy: 'Training profile, membership details, and dossier fields.',
			kind: 'account',
			emphasis: false
		},
		{
			href: '/settings',
			title: 'Settings',
			copy: 'Notification preferences and active session management.',
			kind: 'settings',
			emphasis: false
		}
	);

	if (isVip && user.accessStatus === 'active') {
		links.push({
			href: '/vip-calls',
			title: 'VIP Lounge',
			copy: 'Request and track quarterly VIP call workflow inside the product.',
			kind: 'vip',
			emphasis: true
		});
	}

	if (isAdmin) {
		links.push({
			href: '/admin',
			title: 'Admin panel',
			copy: 'Operations, lesson publishing, members, imports, and events.',
			kind: 'admin',
			emphasis: true
		});
	}

	return links;
}
