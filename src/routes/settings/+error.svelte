<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Settings Error | ShivWorks Network</title>
</svelte:head>

<section class="error-page">
	<div class="error-container">
		<p class="eyebrow">Settings · Error {$page.status}</p>
		<h1>
			{#if $page.status === 401}
				Sign in to access settings.
			{:else}
				Settings failed to load.
			{/if}
		</h1>
		<p class="error-message">
			{$page.error?.message ?? 'An unexpected error occurred loading your settings.'}
		</p>
		<div class="error-actions">
			<a class="btn-primary" href="/dashboard">Return to dashboard</a>
			<a class="ghost-link" href="/login">Sign in</a>
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
