<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Checkout Error | ShivWorks Network</title>
</svelte:head>

<section class="error-page">
	<div class="error-container">
		<p class="eyebrow">Checkout · Error {$page.status}</p>
		<h1>
			{#if $page.status === 402 || $page.error?.message?.toLowerCase().includes('payment')}
				Payment could not be completed.
			{:else if $page.status === 401}
				Sign in to continue.
			{:else}
				Checkout failed to load.
			{/if}
		</h1>
		<p class="error-message">
			{#if $page.status === 402 || $page.error?.message?.toLowerCase().includes('payment')}
				Your payment was not processed. No charge was made. Try again or contact us at
				<a href="mailto:network@shivworks.com">network@shivworks.com</a>.
			{:else if $page.status === 401}
				You need to be signed in to complete checkout.
			{:else}
				{$page.error?.message ??
					'An unexpected error occurred during checkout. No payment was taken.'}
			{/if}
		</p>
		<div class="error-actions">
			{#if $page.status === 401}
				<a class="btn-primary" href="/login">Sign in</a>
			{:else}
				<a class="btn-primary" href="/checkout">Try again</a>
			{/if}
			<a class="ghost-link" href="/dashboard">Return to dashboard</a>
		</div>
		<p class="error-note">
			If you were charged and did not receive access, email
			<a href="mailto:network@shivworks.com">network@shivworks.com</a> and we will resolve it immediately.
		</p>
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
		max-width: 520px;
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

	.error-note {
		margin-top: 2rem;
		font-size: 0.85rem;
		color: var(--color-fg-muted);
	}

	a {
		color: var(--color-accent);
	}
</style>
