<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Dashboard Error | ShivWorks Network</title>
</svelte:head>

<section class="error-page">
	<div class="error-container">
		<p class="eyebrow">Dashboard · Error {$page.status}</p>
		<h1>
			{#if $page.status === 401 || $page.status === 403}
				Access not available.
			{:else}
				Dashboard failed to load.
			{/if}
		</h1>
		<p class="error-message">
			{#if $page.status === 401 || $page.status === 403}
				Your session may have expired or your access level has changed.
			{:else}
				{$page.error?.message ?? 'An unexpected error occurred loading your dashboard.'}
			{/if}
		</p>
		<div class="error-actions">
			<a class="btn-primary" href="/login">Sign in again</a>
			<a class="ghost-link" href="/">Return home</a>
		</div>
	</div>
</section>

<style>
	.error-page {
		min-height: 60vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4rem 1.5rem;
	}

	.error-container {
		max-width: 480px;
		text-align: center;
	}

	.error-message {
		color: var(--color-fg-secondary);
		margin: 1rem 0 2rem;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		align-items: center;
	}
</style>
