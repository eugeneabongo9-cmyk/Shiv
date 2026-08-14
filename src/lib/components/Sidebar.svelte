<script lang="ts">
	import {
		LayoutDashboard,
		BookOpen,
		Radio,
		Users,
		Star,
		Settings,
		Shield,
		User,
		ChevronRight,
		X
	} from 'lucide-svelte';
	import { page } from '$app/stores';
	import SignOutButton from '$lib/components/SignOutButton.svelte';
	import { MEMBERSHIP_TIERS } from '$lib/constants/tiers';

	interface Props {
		user: NonNullable<App.Locals['user']>;
		clerkPublishableKey?: string | null;
		coursesStarted?: number;
		coursesTotal?: number;
		memberRank?: string | null;
		isInstructor?: boolean;
	}

	let {
		user,
		clerkPublishableKey = null,
		coursesStarted = 0,
		coursesTotal = 0,
		memberRank = null,
		isInstructor = false
	}: Props = $props();

	const initials = $derived.by(() => {
		const tokens = user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
		return tokens.length > 0 ? tokens.map((t) => t[0]?.toUpperCase() ?? '').join('') : 'SW';
	});

	const tierLabel = $derived(user.tier ? MEMBERSHIP_TIERS[user.tier].badge : 'Member');
	const rankLine = $derived([tierLabel, memberRank ?? 'Member'].filter(Boolean).join(' · '));

	const currentPath = $derived($page.url.pathname);

	const isPaidMember = $derived(
		user.accessStatus === 'active' && (user.tier === 'bronze' || user.tier === 'vip')
	);

	function isActive(href: string): boolean {
		return currentPath === href || (href !== '/dashboard' && currentPath.startsWith(`${href}/`));
	}

	const navItems: Array<{
		href: string;
		label: string;
		icon: typeof LayoutDashboard;
		vipOnly?: boolean;
		paidOnly?: boolean;
		mobileHide?: boolean;
	}> = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/library', label: 'Library', icon: BookOpen },
		{ href: '/live', label: 'Live', icon: Radio },
		{ href: '/community', label: 'Community', icon: Users },
		{ href: '/vip-calls', label: 'VIP Lounge', icon: Star, vipOnly: true, mobileHide: true }
	];

	const visibleNavItems = $derived(
		navItems.filter((item) => {
			if (item.vipOnly) {
				return (user.tier === 'vip' || user.role === 'admin') && user.accessStatus === 'active';
			}
			if (item.paidOnly) return isPaidMember || user.role === 'admin';
			return true;
		})
	);

	const secondaryItems = [
		{ href: '/account', label: 'Account', icon: User },
		{ href: '/settings', label: 'Settings', icon: Settings }
	];

	let sheetOpen = $state(false);
</script>

<aside class="app-sidebar">
	<div class="sidebar-inner">
		<div class="sidebar-brand">
			<a href="/dashboard" class="sidebar-logo">
				<span class="brand-mark">
					<img src="/cobra-logo.png" alt="ShivWorks" width="42" height="42" />
				</span>
				<span class="sidebar-logo-name">
					<span class="ln1">The ShivWorks</span>
					<span class="ln2"><i>N</i><i>E</i><i>T</i><i>W</i><i>O</i><i>R</i><i>K</i></span>
				</span>
			</a>
		</div>

		<div class="sidebar-identity">
			<div class="user-card">
				<div class="uc-avatar" aria-label="Member avatar">{initials}</div>
				<div class="uc-content">
					<div class="uc-face uc-identity">
						<strong>{user.name}</strong>
						<span class="uc-rank">{rankLine}</span>
					</div>
				</div>
			</div>
		</div>

		<nav class="sidebar-nav" aria-label="Main navigation">
			<p class="sidebar-nav-label">Navigation</p>
			{#each visibleNavItems as item}
				<a
					href={item.href}
					class="sidebar-nav-item"
					class:active={isActive(item.href)}
					class:sb-mobile-hide={item.mobileHide}
					title={item.label}
				>
					<item.icon size={16} />
					<span class="sidebar-nav-text">{item.label}</span>
					{#if isActive(item.href)}
						<ChevronRight size={12} class="sidebar-nav-arrow" />
					{/if}
				</a>
			{/each}
			<button
				type="button"
				class="sidebar-nav-item sb-more-tab"
				onclick={() => (sheetOpen = true)}
				aria-label="More navigation"
			>
				<Settings size={16} />
				<span class="sidebar-nav-text">More</span>
			</button>
		</nav>

		<!-- Handoff places curriculum progress between the primary and secondary nav
		     groups, not in the footer. Kept out of <nav> so it isn't announced as a
		     navigation link. -->
		{#if coursesTotal > 0}
			<div class="sidebar-progress-wrap">
				<div class="sidebar-progress-pill">
					<span class="sidebar-progress-bar">
						<span
							class="sidebar-progress-fill"
							style="width: {Math.round((coursesStarted / coursesTotal) * 100)}%"
						></span>
					</span>
					<span class="sidebar-progress-label">
						{coursesStarted} of {coursesTotal} modules started
					</span>
				</div>
			</div>
		{/if}

		<nav
			class="sidebar-nav sidebar-nav--secondary sb-mobile-hide"
			aria-label="Secondary navigation"
		>
			{#each secondaryItems as item}
				<a
					href={item.href}
					class="sidebar-nav-item"
					class:active={currentPath.startsWith(item.href)}
					title={item.label}
				>
					<item.icon size={16} />
					<span class="sidebar-nav-text">{item.label}</span>
				</a>
			{/each}
			{#if user.role === 'admin'}
				<a
					href="/admin"
					class="sidebar-nav-item sidebar-nav-item--admin"
					class:active={currentPath === '/admin' ||
						(currentPath.startsWith('/admin') && !currentPath.startsWith('/admin/analytics'))}
					title="Admin"
				>
					<Shield size={16} />
					<span class="sidebar-nav-text">Admin</span>
				</a>
			{/if}
			{#if user.role === 'admin' || isInstructor}
				<a
					href="/admin/analytics"
					class="sidebar-nav-item sb-mobile-hide"
					class:active={currentPath.startsWith('/admin/analytics')}
					title="Analytics"
				>
					<Shield size={16} />
					<span class="sidebar-nav-text">Analytics</span>
				</a>
			{/if}
		</nav>

		<div class="sidebar-footer">
			<div class="sidebar-signout">
				<SignOutButton publishableKey={clerkPublishableKey} variant="sidebar" />
			</div>
		</div>
	</div>
</aside>

<div class="sw-sheet" class:open={sheetOpen} hidden={!sheetOpen}>
	<div class="sw-sheet-scrim" onclick={() => (sheetOpen = false)} role="presentation"></div>
	<div class="sw-sheet-panel">
		<div class="sw-sheet-grab"></div>
		<div class="sw-sheet-head">
			<div class="uc-avatar">{initials}</div>
			<div class="sw-sheet-id">
				<strong>{user.name}</strong>
				<span class="uc-rank">{rankLine}</span>
			</div>
			<button
				type="button"
				class="sw-sheet-close"
				onclick={() => (sheetOpen = false)}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</div>
		<p class="sw-sheet-label">Account</p>
		{#each secondaryItems as item}
			<a
				href={item.href}
				class="sw-sheet-row"
				class:active={currentPath.startsWith(item.href)}
				onclick={() => (sheetOpen = false)}
			>
				<item.icon size={18} />
				{item.label}
			</a>
		{/each}
		{#each visibleNavItems.filter((i) => i.mobileHide) as item}
			<a
				href={item.href}
				class="sw-sheet-row"
				class:active={isActive(item.href)}
				onclick={() => (sheetOpen = false)}
			>
				<item.icon size={18} />
				{item.label}
			</a>
		{/each}
		{#if user.role === 'admin'}
			<a href="/admin" class="sw-sheet-row" onclick={() => (sheetOpen = false)}>
				<Shield size={18} />
				Admin
			</a>
		{/if}
		<div class="sw-sheet-signout">
			<SignOutButton publishableKey={clerkPublishableKey} />
		</div>
	</div>
</div>
