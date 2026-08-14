<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Community error · ShivWorks Network</title></svelte:head>

<section class="error-boundary">
	<p class="status">Community</p>
	<h1>The community page isn't loading</h1>
	<p>
		The Circle community itself is up — only this landing surface is broken. You can reach Circle
		directly from your saved bookmark, or come back here in a few minutes.
	</p>
	<div class="actions">
		<a href="/dashboard">My dashboard</a>
		<a href="/library">Browse the library</a>
	</div>
	{#if page.error?.eventId}
		<p class="event-id">Report ID: <code>{page.error.eventId}</code></p>
	{/if}
</section>

<style>
	.error-boundary {
		max-width: 560px;
		margin: 80px auto;
		padding: 0 20px;
		text-align: center;
	}
	.status {
		text-transform: uppercase;
		letter-spacing: 1px;
		color: #888;
		font-size: 12px;
		margin-bottom: 8px;
	}
	h1 {
		font-size: 26px;
		margin: 0 0 12px;
	}
	p {
		color: #555;
		line-height: 1.6;
	}
	.actions {
		display: flex;
		justify-content: center;
		gap: 16px;
		margin: 24px 0;
	}
	.actions a {
		text-decoration: underline;
	}
	.event-id {
		font-size: 12px;
		color: #888;
	}
	.event-id code {
		font-family: ui-monospace, monospace;
	}
</style>
