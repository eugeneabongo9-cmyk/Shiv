<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { Menu, X, Shield, ArrowUpRight, UserRound } from 'lucide-svelte';
	import { isPaidMemberTier } from '$lib/constants/tiers';
	import { PRIMARY_NAV, SHIVWORKS_MAIN_SITE } from '$lib/constants/site';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import SignOutButton from '$lib/components/SignOutButton.svelte';

	function isNavActive(href: string, pathname: string): boolean {
		return pathname === href || pathname.startsWith(`${href}/`);
	}

	interface Props {
		user: App.Locals['user'];
		clerkPublishableKey?: string | null;
		hideLinks?: boolean;
		landingAnchors?: boolean;
	}

	let {
		user,
		clerkPublishableKey = null,
		hideLinks = false,
		landingAnchors = false
	}: Props = $props();

	const navItems = $derived(
		user?.tier === 'free' && user.role !== 'admin'
			? PRIMARY_NAV.filter((item) => item.href !== '/community')
			: PRIMARY_NAV
	);
	const showUpgrade = $derived(
		user
			? user.accessStatus !== 'active' || (!isPaidMemberTier(user.tier) && user.role !== 'admin')
			: false
	);
	const mobilePrimaryHref = $derived(landingAnchors ? '#access' : user ? '/checkout' : '/signup');
	const mobilePrimaryLabel = $derived(
		landingAnchors
			? 'Claim a spot'
			: user
				? user.tier === 'free'
					? 'Activate access'
					: 'Complete access'
				: 'Create account'
	);
	const showMobilePrimaryCta = $derived(!user || showUpgrade);

	let menuOpen = $state(false);

	$effect(() => {
		void $page.url.pathname;
		menuOpen = false;
	});

	$effect(() => {
		if (!browser) return;
		document.documentElement.classList.toggle('nav-menu-open', menuOpen);
		return () => {
			document.documentElement.classList.remove('nav-menu-open');
		};
	});

	function closeMenu() {
		menuOpen = false;
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && menuOpen) closeMenu();
	}}
/>

<header class="site-nav">
	<div class="container nav-inner">
		<a class="brand" href="/">
			<span class="brand-mark">
				<img src="/cobra-logo.png" alt="ShivWorks" width="42" height="42" />
			</span>
			<span class="brand-copy">
				<strong>ShivWorks</strong>
				<span>The Network</span>
			</span>
			<span class="beta-badge" aria-label="Beta platform">BETA</span>
		</a>

		{#if !hideLinks}
			<nav class="nav-links" aria-label="Primary">
				{#if landingAnchors}
					<a href="#curriculum">Curriculum</a>
					<a href="#access">Access</a>
					<a href="#proof">Proof</a>
					<a href="#faq">FAQ</a>
				{:else if user?.accessStatus === 'active'}
					{#each navItems as item}
						{@const active = isNavActive(item.href, $page.url.pathname)}
						<a href={item.href} class:active aria-current={active ? 'page' : undefined}
							>{item.label}</a
						>
					{/each}
					{#if user.tier}
						<MembershipBadge tier={user.tier} />
					{/if}
				{:else}
					<a href={SHIVWORKS_MAIN_SITE} target="_blank" rel="noreferrer">
						Back to ShivWorks
						<ArrowUpRight size={14} />
					</a>
				{/if}
			</nav>
		{/if}

		<div class="nav-actions" class:nav-actions--end={hideLinks}>
			<div class="nav-actions-desktop">
				{#if user}
					<a class="ghost-link" href="/settings">
						<UserRound size={16} />
						{user.name}
					</a>
					{#if showUpgrade}
						<a class="btn-secondary" href="/checkout">
							{user.tier === 'free' ? 'Activate access' : 'Complete access'}
						</a>
					{/if}
					{#if user.role === 'admin'}
						<a class="ghost-link" href="/admin">
							<Shield size={16} />
							Admin
						</a>
					{/if}
					<SignOutButton publishableKey={clerkPublishableKey} />
				{:else if landingAnchors}
					<a class="ghost-link" href="/login">Sign in</a>
					<a class="btn-primary" href="#access">Claim a spot</a>
				{:else}
					<a class="ghost-link" href="/login">Sign in</a>
					<a class="btn-primary" href="/signup">Create account</a>
				{/if}
			</div>

			{#if showMobilePrimaryCta}
				<a class="btn-primary nav-actions-mobile-cta" href={mobilePrimaryHref}>
					{mobilePrimaryLabel}
				</a>
			{/if}

			<button
				type="button"
				class="nav-mobile-toggle"
				onclick={toggleMenu}
				aria-expanded={menuOpen}
				aria-controls="site-nav-mobile-menu"
				aria-label={menuOpen ? 'Close menu' : 'Open menu'}
			>
				{#if menuOpen}
					<X size={20} />
				{:else}
					<Menu size={20} />
				{/if}
			</button>
		</div>
	</div>
</header>

<div id="site-nav-mobile-menu" class="nav-mobile-menu" class:open={menuOpen} hidden={!menuOpen}>
	<div class="nav-mobile-scrim" onclick={closeMenu} role="presentation"></div>
	<nav class="nav-mobile-panel" aria-label="Mobile navigation">
		<div class="nav-mobile-head">
			<span class="nav-mobile-title">Menu</span>
			<button type="button" class="nav-mobile-close" onclick={closeMenu} aria-label="Close menu">
				<X size={18} />
			</button>
		</div>

		{#if !hideLinks}
			{#if landingAnchors}
				<p class="nav-mobile-label">Explore</p>
				<a href="#curriculum" class="nav-mobile-row" onclick={closeMenu}>Curriculum</a>
				<a href="#access" class="nav-mobile-row" onclick={closeMenu}>Access</a>
				<a href="#proof" class="nav-mobile-row" onclick={closeMenu}>Proof</a>
				<a href="#faq" class="nav-mobile-row" onclick={closeMenu}>FAQ</a>
			{:else if user?.accessStatus === 'active'}
				<p class="nav-mobile-label">Platform</p>
				{#each navItems as item}
					{@const active = isNavActive(item.href, $page.url.pathname)}
					<a
						href={item.href}
						class="nav-mobile-row"
						class:active
						aria-current={active ? 'page' : undefined}
						onclick={closeMenu}
					>
						{item.label}
					</a>
				{/each}
				{#if user.tier}
					<div class="nav-mobile-badge">
						<MembershipBadge tier={user.tier} />
					</div>
				{/if}
			{:else}
				<a
					href={SHIVWORKS_MAIN_SITE}
					class="nav-mobile-row"
					target="_blank"
					rel="noreferrer"
					onclick={closeMenu}
				>
					Back to ShivWorks
					<ArrowUpRight size={16} />
				</a>
			{/if}
		{/if}

		<p class="nav-mobile-label">Account</p>
		{#if user}
			<a href="/account" class="nav-mobile-row" onclick={closeMenu}>
				<UserRound size={18} />
				Profile
			</a>
			<a href="/settings" class="nav-mobile-row" onclick={closeMenu}>
				<UserRound size={18} />
				Settings
			</a>
			{#if showUpgrade}
				<a href="/checkout" class="nav-mobile-row nav-mobile-row--emphasis" onclick={closeMenu}>
					{user.tier === 'free' ? 'Activate access' : 'Complete access'}
				</a>
			{/if}
			{#if user.role === 'admin'}
				<a href="/admin" class="nav-mobile-row" onclick={closeMenu}>
					<Shield size={18} />
					Admin
				</a>
			{/if}
			<div class="nav-mobile-signout">
				<SignOutButton publishableKey={clerkPublishableKey} variant="menu" />
			</div>
		{:else}
			<a href="/login" class="nav-mobile-row nav-mobile-row--emphasis" onclick={closeMenu}>
				Sign in
			</a>
			<a href="/signup" class="nav-mobile-row" onclick={closeMenu}>Create account</a>
			{#if landingAnchors}
				<a href="#access" class="nav-mobile-row" onclick={closeMenu}>Claim a spot</a>
			{/if}
		{/if}
	</nav>
</div>

<style>
	.nav-actions--end {
		margin-left: auto;
	}
</style>
