<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Admin Error | ShivWorks Network</title>
</svelte:head>

<section class="error-page">
	<div class="error-container">
		<p class="eyebrow">Admin · Error {$page.status}</p>
		<h1>
			{#if $page.status === 403}
				Admin access required.
			{:else if $page.status === 401}
				Authentication required.
			{:else}
				Admin panel failed to load.
			{/if}
		</h1>
		<p class="error-message">
			{#if $page.status === 403}
				Your account does not have admin privileges. If this is a mistake, contact the ShivWorks
				team.
			{:else}
				{$page.error?.message ?? 'An unexpected error occurred in the admin panel.'}
			{/if}
		</p>
		<div class="error-actions">
			<a class="btn-primary" href="/dashboard">Return to dashboard</a>
			<a class="ghost-link" href="/">Home</a>
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
