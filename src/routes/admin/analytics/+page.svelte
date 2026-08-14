<script lang="ts">
	import { ArrowRight, BarChart3, Mail } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();
	const analytics = $derived(data.analytics);
	let showBulkNudgeConfirmation = $state(false);
</script>

<svelte:head>
	<title>Admin · Analytics | ShivWorks Network</title>
</svelte:head>

<section class="analytics-page">
	<header class="analytics-head section-heading compact">
		<p class="eyebrow">Admin · Analytics</p>
		<h2>Network snapshot</h2>
		<p>Founding sales, member activity, and curriculum engagement from live D1 data.</p>
		<a class="ghost-link analytics-ops-link" href="/admin">
			Open operations console
			<ArrowRight size={16} />
		</a>
	</header>

	{#if form?.error}
		<p class="form-error" role="alert">{form.error}</p>
	{:else if form?.success}
		<p class="form-success" role="status">{form.success}</p>
	{/if}

	<section class="analytics-section" aria-labelledby="founding-heading">
		<h3 id="founding-heading" class="analytics-section-title">Founding members</h3>
		<div class="stat-grid">
			<div class="stat">
				<div class="sv">{analytics.founding.bronzeSold}</div>
				<div class="sl">Bronze sold (lifetime)</div>
				<div class="sd">
					{analytics.founding.bronzeSignedUp} active · {analytics.founding.bronzeClaimed30d}
					claimed in the last 30 days
				</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.founding.vipSold}</div>
				<div class="sl">VIP sold (lifetime)</div>
				<div class="sd">
					{analytics.founding.vipSignedUp} active · {analytics.founding.vipClaimed30d}
					claimed in the last 30 days
				</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.founding.awaitingSignup}</div>
				<div class="sl">Awaiting signup</div>
				<div class="sd">Purchased, not claimed in Clerk yet</div>
				{#if analytics.founding.awaitingSignup > 0}
					<div class="analytics-nudge-form">
						<button
							class="btn-secondary"
							type="button"
							onclick={() => (showBulkNudgeConfirmation = true)}
						>
							<Mail size={14} />
							Review re-nudge recipients
						</button>
						{#if showBulkNudgeConfirmation}
							<div
								class="status-message subtle"
								role="dialog"
								aria-labelledby="analytics-nudge-confirmation-title"
							>
								<strong id="analytics-nudge-confirmation-title">
									Send onboarding re-nudges?
								</strong>
								<p>
									Up to {analytics.founding.awaitingSignup} awaiting-signup records will be checked. Claimed,
									inactive, ineligible, and recently emailed records will be skipped.
								</p>
								<button
									class="btn-secondary"
									type="button"
									onclick={() => (showBulkNudgeConfirmation = false)}
								>
									Cancel
								</button>
								<form method="POST" action="?/nudgeAwaitingSignups">
									<input type="hidden" name="confirmBulkNudge" value="confirm" />
									<button class="btn-primary" type="submit">Confirm and send re-nudges</button>
								</form>
							</div>
						{/if}
					</div>
					<a class="ghost-link analytics-nudge-link" href="/admin#imports">Open import queue</a>
				{/if}
			</div>
			<div class="stat">
				<div class="sv">{analytics.founding.bronzeSold + analytics.founding.vipSold}</div>
				<div class="sl">Total sold</div>
				<div class="sd">
					{analytics.founding.bronzeSignedUp + analytics.founding.vipSignedUp} active paid accounts
				</div>
			</div>
		</div>
	</section>

	<section class="analytics-section" aria-labelledby="engagement-heading">
		<h3 id="engagement-heading" class="analytics-section-title">Engagement (paid members)</h3>
		<div class="stat-grid">
			<div class="stat">
				<div class="sv">{analytics.engagement.dau}</div>
				<div class="sl">Daily active</div>
				<div class="sd up">{analytics.engagement.dauPct}% of paid active</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.engagement.wau}</div>
				<div class="sl">Weekly active</div>
				<div class="sd up">{analytics.engagement.wauPct}% of paid active</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.engagement.mau}</div>
				<div class="sl">Monthly active</div>
				<div class="sd">Last 30 days</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.engagement.completions30d}</div>
				<div class="sl">Module completions</div>
				<div class="sd">Finished in the last 30 days</div>
			</div>
		</div>
	</section>

	<section class="analytics-section" aria-labelledby="roster-heading">
		<h3 id="roster-heading" class="analytics-section-title">Member roster</h3>
		<div class="stat-grid">
			<div class="stat">
				<div class="sv">{analytics.members.total}</div>
				<div class="sl">Total accounts</div>
				<div class="sd">{analytics.members.active} with active access</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.members.free}</div>
				<div class="sl">Free</div>
				<div class="sd">Signed up without purchase</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.members.bronze}</div>
				<div class="sl">Bronze</div>
				<div class="sd">Paid founding lane</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.members.vip}</div>
				<div class="sl">VIP</div>
				<div class="sd">Top-tier founding lane</div>
			</div>
		</div>
	</section>

	<section class="analytics-section" aria-labelledby="content-heading">
		<h3 id="content-heading" class="analytics-section-title">Content activity (30 days)</h3>
		<div class="analytics-split-grid">
			<article class="panel analytics-panel">
				<p class="card-eyebrow">Top courses</p>
				{#if analytics.content.topCourses.length === 0}
					<p class="analytics-empty">No course activity in the last 30 days.</p>
				{:else}
					<ul class="analytics-rank-list">
						{#each analytics.content.topCourses as item}
							<li>
								<span>{item.label}</span>
								<strong>{item.value}</strong>
							</li>
						{/each}
					</ul>
				{/if}
			</article>

			<article class="panel analytics-panel">
				<p class="card-eyebrow">Top modules</p>
				{#if analytics.content.topModules.length === 0}
					<p class="analytics-empty">No module activity in the last 30 days.</p>
				{:else}
					<ul class="analytics-rank-list">
						{#each analytics.content.topModules as item}
							<li>
								<span>
									{item.label}
									{#if item.subtitle}
										<small>{item.subtitle}</small>
									{/if}
								</span>
								<strong>{item.value}</strong>
							</li>
						{/each}
					</ul>
				{/if}
			</article>
		</div>
	</section>

	<section class="analytics-section" aria-labelledby="retention-heading">
		<h3 id="retention-heading" class="analytics-section-title">
			Inactive 14+ days ({analytics.retention.inactiveCount})
		</h3>
		<article class="panel analytics-panel">
			{#if analytics.retention.inactive.length === 0}
				<p class="analytics-empty">Every paid member has been active in the last 14 days.</p>
			{:else}
				<ul class="analytics-rank-list analytics-rank-list--wide">
					{#each analytics.retention.inactive as member}
						<li>
							<span>
								{member.name}
								<small>{member.email}</small>
							</span>
							<strong>{member.daysInactive}d · {member.tier}</strong>
						</li>
					{/each}
				</ul>
				{#if analytics.retention.inactiveCount > analytics.retention.inactive.length}
					<p class="analytics-footnote">
						Showing top {analytics.retention.inactive.length} of {analytics.retention
							.inactiveCount}.
					</p>
				{/if}
			{/if}
		</article>
	</section>

	<section class="analytics-section" aria-labelledby="ops-heading">
		<h3 id="ops-heading" class="analytics-section-title">Operations</h3>
		<div class="stat-grid">
			<div class="stat">
				<div class="sv">{analytics.ops.lessonsPublished}</div>
				<div class="sl">Published lessons</div>
				<div class="sd">{analytics.ops.lessonsDraft} still in draft</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.ops.lessonsWithVideo}</div>
				<div class="sl">Lessons with video</div>
				<div class="sd">Primary episode linked</div>
			</div>
			<div class="stat">
				<div class="sv">{analytics.ops.pendingVipRequests}</div>
				<div class="sl">VIP requests pending</div>
				<div class="sd">Needs staff review</div>
			</div>
			<div class="stat stat--link">
				<BarChart3 size={22} />
				<div class="sl">Full admin console</div>
				<a class="ghost-link" href="/admin">Manage members & media →</a>
			</div>
		</div>
	</section>
</section>
