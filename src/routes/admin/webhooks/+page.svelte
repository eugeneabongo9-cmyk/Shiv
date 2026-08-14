<script lang="ts">
	import { enhance } from '$app/forms';
	import { RotateCcw, Webhook } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	function formatTime(ms: number | null | undefined): string {
		if (!ms) return '—';
		return new Date(ms).toLocaleString();
	}

	function statusClass(status: string): string {
		switch (status) {
			case 'completed':
				return 'ok';
			case 'failed':
				return 'warn';
			case 'dead_letter':
				return 'bad';
			case 'processing':
				return 'pending';
			default:
				return '';
		}
	}
</script>

<svelte:head>
	<title>Admin · Webhooks | ShivWorks Network</title>
</svelte:head>

<section class="webhooks-page">
	<header class="webhooks-head section-heading compact">
		<p class="eyebrow">Admin · Webhooks</p>
		<h2>WooCommerce pipeline</h2>
		<p>Durable event log, failure queue, and replay tooling for purchase webhooks.</p>
	</header>

	<div class="stat-grid">
		<div class="stat">
			<div class="sv">{data.metrics.total24h}</div>
			<div class="sl">Received (24h)</div>
		</div>
		<div class="stat">
			<div class="sv">{data.metrics.completed24h}</div>
			<div class="sl">Completed (24h)</div>
		</div>
		<div class="stat">
			<div class="sv">{data.metrics.failed24h}</div>
			<div class="sl">Failed (24h)</div>
		</div>
		<div class="stat">
			<div class="sv">{data.metrics.pendingRetry}</div>
			<div class="sl">Pending retry</div>
		</div>
		<div class="stat">
			<div class="sv">{data.metrics.deadLetterTotal}</div>
			<div class="sl">Dead letter</div>
		</div>
		<div class="stat">
			<div class="sv">{data.metrics.processing}</div>
			<div class="sl">In flight</div>
		</div>
	</div>

	<div class="webhooks-toolbar">
		<span class="toolbar-label"><Webhook size={16} /> Filter</span>
		<a class="filter-chip" class:on={data.filterStatus === 'all'} href="/admin/webhooks">All</a>
		<a
			class="filter-chip"
			class:on={data.filterStatus === 'failed'}
			href="/admin/webhooks?status=failed">Failed</a
		>
		<a
			class="filter-chip"
			class:on={data.filterStatus === 'dead_letter'}
			href="/admin/webhooks?status=dead_letter">Dead letter</a
		>
		<a
			class="filter-chip"
			class:on={data.filterStatus === 'completed'}
			href="/admin/webhooks?status=completed">Completed</a
		>
		<form method="POST" action="?/processDueRetries" use:enhance class="due-retry-form">
			<button class="btn-secondary" type="submit" disabled={data.metrics.pendingRetry === 0}>
				<RotateCcw size={14} />
				Process due retries ({data.metrics.pendingRetry})
			</button>
		</form>
	</div>

	{#if form?.processedDue}
		<div class="status-message">
			Processed {form.processed} due event{form.processed === 1 ? '' : 's'} · {form.completed} completed
			· {form.failed} failed
		</div>
	{/if}

	{#if form?.error}
		<p class="form-error" role="alert">{form.error}</p>
	{:else if form?.replayed}
		<p class="form-success" role="status">
			Replay finished for {form.eventId}: {form.status}
			{#if form.error}<span class="muted"> — {form.error}</span>{/if}
		</p>
	{/if}

	<div class="webhooks-layout">
		<div class="webhooks-table-wrap">
			<table class="webhooks-table">
				<thead>
					<tr>
						<th>Order</th>
						<th>Email</th>
						<th>Tier</th>
						<th>Status</th>
						<th>Attempts</th>
						<th>Received</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.events as event}
						<tr>
							<td>#{event.orderId ?? '—'}</td>
							<td>{event.email ?? '—'}</td>
							<td>{event.tier ?? '—'}</td>
							<td><span class="status-pill {statusClass(event.status)}">{event.status}</span></td>
							<td>{event.attemptCount}/{event.maxAttempts}</td>
							<td>{formatTime(event.receivedAt)}</td>
							<td>
								<a class="ghost-link" href="/admin/webhooks?event={event.id}">Details</a>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="empty-cell">No webhook events recorded yet.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if data.selected?.event}
			<aside class="webhook-detail card">
				<h3>Event detail</h3>
				<dl class="detail-list">
					<div>
						<dt>ID</dt>
						<dd>{data.selected.event.id}</dd>
					</div>
					<div>
						<dt>Order</dt>
						<dd>#{data.selected.event.orderId}</dd>
					</div>
					<div>
						<dt>Status</dt>
						<dd>{data.selected.event.status}</dd>
					</div>
					<div>
						<dt>Failed step</dt>
						<dd>{data.selected.event.failedStep ?? '—'}</dd>
					</div>
					<div>
						<dt>Last error</dt>
						<dd>{data.selected.event.lastError ?? '—'}</dd>
					</div>
					<div>
						<dt>Next retry</dt>
						<dd>{formatTime(data.selected.event.nextRetryAt)}</dd>
					</div>
				</dl>

				{#if data.selected.event.status === 'failed' || data.selected.event.status === 'dead_letter'}
					<form method="POST" action="?/replayEvent" use:enhance>
						<input type="hidden" name="eventId" value={data.selected.event.id} />
						<button type="submit" class="btn-primary">
							<RotateCcw size={16} />
							Replay event
						</button>
					</form>
				{/if}

				<h4>Processing steps</h4>
				<ol class="step-list">
					{#each data.selected.steps as step}
						<li>
							<strong>{step.step}</strong>
							<span class="status-pill {statusClass(step.status)}">{step.status}</span>
							<span class="muted">attempt {step.attempt}</span>
							{#if step.error}<p class="step-error">{step.error}</p>{/if}
						</li>
					{:else}
						<li class="muted">No steps recorded.</li>
					{/each}
				</ol>
			</aside>
		{/if}
	</div>
</section>

<style>
	.webhooks-page {
		display: grid;
		gap: 1.5rem;
	}

	.webhooks-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.toolbar-label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--muted);
		font-size: 0.85rem;
	}

	.filter-chip {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		font-size: 0.85rem;
	}

	.filter-chip.on {
		border-color: var(--accent);
		color: var(--accent);
	}

	.webhooks-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
		gap: 1rem;
	}

	.webhooks-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 12px;
	}

	.webhooks-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.webhooks-table th,
	.webhooks-table td {
		padding: 0.75rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
	}

	.empty-cell {
		color: var(--muted);
		text-align: center;
	}

	.webhook-detail {
		padding: 1rem;
		display: grid;
		gap: 0.75rem;
		align-content: start;
	}

	.detail-list {
		display: grid;
		gap: 0.5rem;
		margin: 0;
	}

	.detail-list div {
		display: grid;
		grid-template-columns: 7rem 1fr;
		gap: 0.5rem;
	}

	.detail-list dt {
		color: var(--muted);
	}

	.detail-list dd {
		margin: 0;
		word-break: break-word;
	}

	.step-list {
		margin: 0;
		padding-left: 1rem;
		display: grid;
		gap: 0.75rem;
	}

	.step-error {
		margin: 0.25rem 0 0;
		color: #e05252;
		font-size: 0.85rem;
	}

	.status-pill {
		display: inline-block;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.status-pill.ok {
		background: rgba(82, 168, 130, 0.15);
		color: #52a882;
	}

	.status-pill.warn {
		background: rgba(224, 140, 82, 0.15);
		color: #e08c52;
	}

	.status-pill.bad {
		background: rgba(224, 82, 82, 0.15);
		color: #e05252;
	}

	.status-pill.pending {
		background: rgba(82, 136, 224, 0.15);
		color: #5288e0;
	}

	.form-error {
		color: #e05252;
	}

	.form-success {
		color: #52a882;
	}

	.muted {
		color: var(--muted);
	}

	@media (max-width: 960px) {
		.webhooks-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
