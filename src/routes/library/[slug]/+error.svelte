<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Course Error | ShivWorks Network</title>
</svelte:head>

<section class="error-page">
	<div class="error-container">
		<p class="eyebrow">Course · Error {$page.status}</p>
		<h1>
			{#if $page.status === 403}
				Access not included in your plan.
			{:else if $page.status === 404}
				Course not found.
			{:else}
				Course failed to load.
			{/if}
		</h1>
		<p class="error-message">
			{#if $page.status === 403}
				This course is included with Bronze and VIP founding memberships.
			{:else if $page.status === 404}
				This course may have been moved or is not yet published.
			{:else}
				{$page.error?.message ?? 'An unexpected error occurred loading this course.'}
			{/if}
		</p>
		<div class="error-actions">
			{#if $page.status === 403}
				<a class="btn-primary" href="/checkout">Become a founding member</a>
			{/if}
			<a class="btn-secondary" href="/library">Back to library</a>
			<a class="ghost-link" href="/dashboard">Dashboard</a>
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
