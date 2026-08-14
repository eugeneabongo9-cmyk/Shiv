<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>VIP calls error · ShivWorks Network</title></svelte:head>

{#if page.error?.code === 'AUTH_FORBIDDEN' || page.status === 403}
	<section class="error-boundary">
		<p class="status">VIP calls</p>
		<h1>VIP access required</h1>
		<p>VIP calls are reserved for VIP-tier members. Upgrade your membership to book a 1:1.</p>
		<div class="actions">
			<a class="primary" href="/checkout">Upgrade to VIP</a>
			<a href="/dashboard">My dashboard</a>
		</div>
		{#if page.error?.eventId}
			<p class="event-id">Report ID: <code>{page.error.eventId}</code></p>
		{/if}
	</section>
{:else}
	<section class="error-boundary">
		<p class="status">VIP calls</p>
		<h1>We couldn't load the VIP page</h1>
		<p>
			Something glitched on our end. If you were mid-booking, your form data was not saved — try
			again in a moment.
		</p>
		<div class="actions">
			<a class="primary" href="/vip-calls">Try again</a>
			<a href="/dashboard">My dashboard</a>
		</div>
		{#if page.error?.eventId}
			<p class="event-id">Report ID: <code>{page.error.eventId}</code></p>
		{/if}
	</section>
{/if}

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
	.actions a.primary {
		text-decoration: none;
		padding: 10px 20px;
		background: #000;
		color: #fff;
		border-radius: 6px;
	}
	.event-id {
		font-size: 12px;
		color: #888;
	}
	.event-id code {
		font-family: ui-monospace, monospace;
	}
</style>
