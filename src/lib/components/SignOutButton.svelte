<script lang="ts">
	import { LogOut } from 'lucide-svelte';
	import { loadBrowserClerk } from '$lib/client/clerk';

	interface Props {
		publishableKey?: string | null;
		variant?: 'inline' | 'sidebar' | 'menu';
	}

	let { publishableKey = null, variant = 'inline' }: Props = $props();
	let isLoading = $state(false);

	async function handleSignOut() {
		isLoading = true;
		try {
			const clerk = await loadBrowserClerk(publishableKey);
			await clerk.signOut({ redirectUrl: '/login' });
		} finally {
			isLoading = false;
		}
	}
</script>

{#if variant === 'sidebar'}
	<button
		type="button"
		class="sidebar-nav-item sidebar-signout-btn"
		disabled={isLoading}
		onclick={handleSignOut}
	>
		<LogOut size={16} />
		<span class="sidebar-nav-text">{isLoading ? 'Signing out…' : 'Sign out'}</span>
	</button>
{:else if variant === 'menu'}
	<button
		type="button"
		class="nav-mobile-row nav-mobile-signout-btn"
		disabled={isLoading}
		onclick={handleSignOut}
	>
		<LogOut size={18} />
		{isLoading ? 'Signing out…' : 'Sign out'}
	</button>
{:else}
	<button class="ghost-link" disabled={isLoading} onclick={handleSignOut}>
		<LogOut size={16} />
		{isLoading ? 'Signing out…' : 'Sign out'}
	</button>
{/if}
