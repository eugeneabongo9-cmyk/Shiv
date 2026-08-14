<script lang="ts">
	import { ArrowRight, CalendarClock } from 'lucide-svelte';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const isFree = $derived(data.user.tier === 'free');
	const leadUpdate = $derived(data.updates[0] ?? null);
	const secondaryUpdates = $derived(data.updates.slice(1));
	const latestUpdateLabel = $derived(
		leadUpdate ? formatRelativeDate(leadUpdate.publishedAt) : 'No updates yet'
	);
	const plannedJulyUpdates = [
		{
			label: 'Course',
			title: 'Seizing Initiative',
			body: 'Next curriculum block for paid members.',
			when: 'July 2026'
		},
		{
			label: 'Course',
			title: 'Lost Initiative and the Default Position',
			body: 'Second July training release.',
			when: 'July 2026'
		},
		{
			label: 'Feature',
			title: 'Leaderboard',
			body: 'Training points and member ranking.',
			when: 'July 2026'
		},
		{
			label: 'VIP',
			title: 'Quarterly VIP calls',
			body: 'In-product VIP call requests and scheduling workflow.',
			when: 'After launch'
		},
		{
			label: 'Series',
			title: 'Spotlight Episode 1',
			body: 'First episode in the Spotlight series.',
			when: 'July 2026'
		}
	];

	function formatRelativeDate(value: number): string {
		const diffMs = Date.now() - value;
		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		if (hours < 24) {
			return 'Today';
		}

		const days = Math.floor(hours / 24);
		if (days === 1) {
			return 'Yesterday';
		}

		if (days < 7) {
			return `${days} days ago`;
		}

		const weeks = Math.floor(days / 7);
		if (weeks < 5) {
			return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
		}

		return formatAbsoluteDate(value);
	}

	function formatAbsoluteDate(value: number): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(value));
	}

	function formatEventDate(value: number | null): string {
		if (!value) {
			return 'Date coming soon';
		}

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(value));
	}
</script>

<svelte:head>
	<title>Updates | ShivWorks Network</title>
</svelte:head>

<main>
	<div class="container">
		<div class="upd">
			<header class="upd-head section-heading" style="margin-bottom:0;max-width:none;">
				<p class="eyebrow">The Network</p>
				<h1>Updates</h1>
				<p class="lede">
					{#if isFree}
						Preview build-log entries. Full briefings unlock with membership.
					{:else}
						Release notes and member scheduling updates — newest first.
					{/if}
				</p>
			</header>

			{#if isFree}
				<div class="status-message upgrade-banner upd-upgrade">
					<strong>Preview only.</strong>
					<span>Upgrade for the full build log and member briefings.</span>
					<a class="ghost-link" href="/checkout">Upgrade access</a>
				</div>
			{/if}

			{#if leadUpdate}
				<section class="upd-section" aria-labelledby="latest-update-heading">
					<article class="panel upd-lead">
						<p class="eyebrow">Latest brief</p>
						<h2 id="latest-update-heading">{leadUpdate.title}</h2>
						<p class="upd-lead-body">{leadUpdate.bodyMarkdown}</p>
						<div class="updates-meta-row">
							<span class="detail-pill">
								<CalendarClock size={14} />
								{latestUpdateLabel}
							</span>
							<span class="detail-pill muted">{formatAbsoluteDate(leadUpdate.publishedAt)}</span>
							<span class="detail-pill muted">{getAudienceLabel(leadUpdate.audience)}</span>
							{#if leadUpdate.authorName}
								<span class="detail-pill muted">{leadUpdate.authorName}</span>
							{/if}
						</div>
					</article>
				</section>

				<section class="upd-section" aria-label="Network snapshot">
					<div class="upd-stat-row">
						<div class="upd-stat">
							<span>Briefings</span>
							<strong>{data.updates.length}</strong>
						</div>
						<div class="upd-stat">
							<span>Ready courses</span>
							<strong>{data.courseCounts.available}</strong>
						</div>
						<div class="upd-stat">
							<span>Live sessions</span>
							<strong>{data.eventCounts.live + data.eventCounts.scheduled}</strong>
						</div>
					</div>
				</section>

				<section class="upd-section" aria-label="Quick links">
					<div class="upd-quick-grid">
						<article class="panel upd-quick-card">
							<p class="eyebrow">Library</p>
							<h3>
								{#if data.courseCounts.available > 0}
									{data.courseCounts.available} course{data.courseCounts.available === 1 ? '' : 's'} ready
								{:else}
									Curriculum roadmap
								{/if}
							</h3>
							<p>
								{#if data.courseCounts.available > 0}
									{data.courseCounts.roadmap} more on the roadmap.
								{:else}
									Modules promote here as they go live.
								{/if}
							</p>
							<a class="ghost-link" href="/library">
								Open library
								<ArrowRight size={16} />
							</a>
						</article>

						<article class="panel upd-quick-card">
							<p class="eyebrow">Live</p>
							{#if data.nextEvent}
								<h3>{data.nextEvent.title}</h3>
								<p>
									{data.nextEvent.status === 'live'
										? 'Live now — open the live page to join.'
										: data.nextEvent.status === 'scheduled'
											? `Scheduled for ${formatEventDate(data.nextEvent.startsAt)}.`
											: 'Last session ended — check for what is next.'}
								</p>
							{:else}
								<h3>No session queued</h3>
								<p>The next live touchpoint will appear here when scheduled.</p>
							{/if}
							<a class="ghost-link" href="/live">
								Open live page
								<ArrowRight size={16} />
							</a>
						</article>
					</div>
				</section>
			{:else}
				<section class="upd-section">
					<article class="panel upd-empty">
						<p class="card-eyebrow">No briefings yet</p>
						<h2>Updates will appear here as ShivWorks publishes them.</h2>
						<p>Check the library and live pages for what is available now.</p>
						<div class="upd-quick-grid upd-quick-grid--compact">
							<a class="btn-secondary" href="/library">Open library</a>
							<a class="btn-secondary" href="/live">Open live page</a>
						</div>
					</article>
				</section>
			{/if}

			<section class="upd-section" aria-labelledby="planned-updates-heading">
				<div class="upd-section-head">
					<p class="eyebrow">Coming next</p>
					<h2 id="planned-updates-heading">July 2026 roadmap</h2>
				</div>
				<div class="upd-roadmap-grid">
					{#each plannedJulyUpdates as item}
						<article class="panel upd-roadmap-card">
							<p class="eyebrow">{item.label}</p>
							<h3>{item.title}</h3>
							<p>{item.body}</p>
							<span class="detail-pill">
								<CalendarClock size={14} />
								{item.when}
							</span>
						</article>
					{/each}
				</div>
			</section>

			{#if leadUpdate}
				<section class="upd-section" aria-labelledby="archive-heading">
					<div class="upd-section-head">
						<p class="eyebrow">Archive</p>
						<h2 id="archive-heading">Previous briefs</h2>
					</div>

					<div class="upd-archive-list">
						{#if secondaryUpdates.length === 0}
							<article class="panel upd-archive-item">
								<p class="card-eyebrow">Just getting started</p>
								<h3>The latest brief is the only entry so far.</h3>
							</article>
						{:else}
							{#each secondaryUpdates as item}
								<article class="panel upd-archive-item">
									<div class="upd-archive-top">
										<div>
											<p class="card-eyebrow">{formatRelativeDate(item.publishedAt)}</p>
											<h3>{item.title}</h3>
										</div>
										<small>{formatAbsoluteDate(item.publishedAt)}</small>
									</div>
									<p>{item.bodyMarkdown}</p>
									<div class="updates-meta-row">
										<span class="detail-pill muted">{getAudienceLabel(item.audience)}</span>
										{#if item.authorName}
											<span class="detail-pill muted">{item.authorName}</span>
										{/if}
									</div>
								</article>
							{/each}
						{/if}
					</div>
				</section>
			{/if}
		</div>
	</div>
</main>
