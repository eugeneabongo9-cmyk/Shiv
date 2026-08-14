<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ComingSoon from '$lib/components/ComingSoon.svelte';
	import { initPageflow } from '$lib/client/pageflow';
	import { loadBrowserClerk } from '$lib/client/clerk';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';

	if (browser) {
		initPageflow();
	}

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	onMount(() => {
		const publishableKey = data.publicConfig.clerkPublishableKey;
		if (!publishableKey) return;

		void loadBrowserClerk(publishableKey).catch((error) => {
			console.error('Failed to initialize Clerk session', error);
		});
	});

	const currentPath = $derived($page.url.pathname);

	// Sidebar appears on member surfaces only — and only when the viewer has
	// active access. Public + auth surfaces (/, /login, /signup, /welcome,
	// /checkout) keep the top <Nav>. Mirrors aaron-canonical layout.
	const isSidebarPage = $derived(
		data.user?.accessStatus === 'active' &&
			(currentPath.startsWith('/dashboard') ||
				currentPath.startsWith('/library') ||
				currentPath.startsWith('/community') ||
				currentPath.startsWith('/live') ||
				currentPath.startsWith('/updates') ||
				currentPath.startsWith('/messages') ||
				currentPath.startsWith('/leaderboard') ||
				currentPath.startsWith('/find-partners') ||
				currentPath.startsWith('/vip-calls') ||
				currentPath.startsWith('/account') ||
				currentPath.startsWith('/profile') ||
				currentPath.startsWith('/settings') ||
				currentPath.startsWith('/admin'))
	);

	// v2-1.3 launch gating — when data.gated is non-null, the layout renders
	// ComingSoon for the page content instead of the route's real page.
	// Admins always bypass (see src/lib/server/launch-gating.ts).
	const gated = $derived(data.gated ?? null);
	const showFoundingAccessCta = $derived(
		Boolean(gated && data.user && data.user.tier === 'free' && data.user.role !== 'admin')
	);
	const foundingAccessHref = $derived(
		showFoundingAccessCta ? `/checkout?redirect=${encodeURIComponent(currentPath)}` : null
	);

	const isAuthPage = $derived(
		currentPath.startsWith('/login') || currentPath.startsWith('/signup')
	);
</script>

{#if isSidebarPage}
	<div class="page-frame page-frame--sidebar">
		<Sidebar
			user={data.user!}
			clerkPublishableKey={data.publicConfig.clerkPublishableKey}
			coursesStarted={data.shell?.modulesStarted ?? 0}
			coursesTotal={data.shell?.modulesTotal ?? 0}
			memberRank={data.shell?.rank ?? null}
		/>
		<main class="page-main page-main--sidebar sidebar-main">
			{#if gated}
				<ComingSoon
					title={gated.name}
					eyebrow={gated.eyebrow}
					subtitle={gated.eta}
					body={gated.body ?? ''}
					icon={gated.icon}
					surface={gated.surface}
					highlights={gated.highlights}
					trackerMode={gated.trackerMode}
					trackerHeading={gated.trackerHeading}
					fallback={gated.fallback ?? null}
					tracker={data.upcomingTracker}
					{foundingAccessHref}
					{showFoundingAccessCta}
				/>
			{:else}
				{@render children()}
			{/if}
		</main>
	</div>
{:else}
	<div class="page-frame" class:page-frame--auth={isAuthPage}>
		<Nav
			user={data.user}
			clerkPublishableKey={data.publicConfig.clerkPublishableKey}
			landingAnchors={currentPath === '/' && data.user?.accessStatus !== 'active'}
		/>
		<main class="page-main" class:page-main--auth={isAuthPage}>
			{#if gated}
				<ComingSoon
					title={gated.name}
					eyebrow={gated.eyebrow}
					subtitle={gated.eta}
					body={gated.body ?? ''}
					icon={gated.icon}
					surface={gated.surface}
					highlights={gated.highlights}
					trackerMode={gated.trackerMode}
					trackerHeading={gated.trackerHeading}
					fallback={gated.fallback ?? null}
					tracker={data.upcomingTracker}
					{foundingAccessHref}
					{showFoundingAccessCta}
				/>
			{:else}
				{@render children()}
			{/if}
		</main>
		{#if !isAuthPage}
			<Footer />
		{/if}
	</div>
{/if}

<style>
	.page-frame--sidebar {
		display: block;
	}
	.page-main--sidebar {
		min-width: 0;
		overflow-x: clip;
	}
</style>
