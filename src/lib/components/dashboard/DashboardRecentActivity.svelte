<script lang="ts">
	import { ArrowRight, CalendarClock, Flame, PlayCircle, RadioTower, Star } from 'lucide-svelte';
	import type { DashboardActivitySnapshot } from '$lib/server/dashboard';

	interface Props {
		activity: DashboardActivitySnapshot;
	}

	let { activity }: Props = $props();

	function formatRelativeDate(value: number): string {
		const diffMs = Date.now() - value;
		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		if (hours < 24) return 'Today';
		const days = Math.floor(hours / 24);
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(value));
	}

	function formatEventWhen(startsAt: number | null, status: string): string {
		if (status === 'live') return 'Live now';
		if (!startsAt) return 'Date TBA';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(startsAt));
	}

	const rankLabel = $derived(activity.gamification.rank ?? 'Recruit');
	const streakLabel = $derived(
		activity.gamification.streakDays === 0
			? 'No active streak yet'
			: activity.gamification.streakDays === 1
				? '1 day streak'
				: `${activity.gamification.streakDays} day streak`
	);
</script>

<article class="panel dashboard-hub-block dashboard-hub-activity">
	<div class="section-heading compact dashboard-hub-block-heading">
		<div>
			<p class="eyebrow">Recent activity</p>
			<h2>Your lane inside the network</h2>
		</div>
	</div>

	<div class="dashboard-hub-activity-list">
		{#if activity.resume}
			<a class="dashboard-hub-activity-row" href={activity.resume.href}>
				<PlayCircle size={18} />
				<div>
					<p class="card-eyebrow">Last watched module</p>
					<strong>{activity.resume.courseTitle}</strong>
					<p>{activity.resume.moduleTitle} · {activity.resume.progressLabel}</p>
				</div>
				<span class="ghost-link">Resume</span>
			</a>
		{:else}
			<div class="dashboard-hub-activity-row dashboard-hub-activity-row--empty">
				<PlayCircle size={18} />
				<div>
					<p class="card-eyebrow">Last watched module</p>
					<strong>No training progress yet</strong>
					<p>When modules go live in the library, your last watched block will appear here.</p>
				</div>
			</div>
		{/if}

		<div class="dashboard-hub-activity-row">
			<Star size={18} />
			<div>
				<p class="card-eyebrow">Training points</p>
				<strong>{activity.gamification.trainingPoints.toLocaleString()} TP</strong>
				<p>Rank · {rankLabel}</p>
			</div>
		</div>

		<div class="dashboard-hub-activity-row">
			<Flame size={18} />
			<div>
				<p class="card-eyebrow">Current streak</p>
				<strong>{streakLabel}</strong>
				<p>Complete modules and attend live sessions to extend your streak.</p>
			</div>
		</div>

		{#if activity.nextRsvp}
			<a class="dashboard-hub-activity-row" href={activity.nextRsvp.href}>
				<RadioTower size={18} />
				<div>
					<p class="card-eyebrow">Next RSVP</p>
					<strong>{activity.nextRsvp.title}</strong>
					<p>{formatEventWhen(activity.nextRsvp.startsAt, activity.nextRsvp.status)}</p>
				</div>
				<span class="ghost-link">Open live</span>
			</a>
		{:else}
			<div class="dashboard-hub-activity-row dashboard-hub-activity-row--empty">
				<RadioTower size={18} />
				<div>
					<p class="card-eyebrow">Next RSVP</p>
					<strong>No RSVP on file</strong>
					<p>RSVP to a live touchpoint in the Live lane and it will show up here.</p>
				</div>
				<a class="ghost-link" href="/live">Browse live</a>
			</div>
		{/if}

		{#if activity.latestUpdate}
			<a class="dashboard-hub-activity-row" href={activity.latestUpdate.href}>
				<CalendarClock size={18} />
				<div>
					<p class="card-eyebrow">Latest network update</p>
					<strong>{activity.latestUpdate.title}</strong>
					<p>{formatRelativeDate(activity.latestUpdate.publishedAt)}</p>
				</div>
				<span class="ghost-link">Read</span>
			</a>
		{:else}
			<div class="dashboard-hub-activity-row dashboard-hub-activity-row--empty">
				<CalendarClock size={18} />
				<div>
					<p class="card-eyebrow">Latest network update</p>
					<strong>No briefings in your lane yet</strong>
					<p>Release notes for your access tier will appear here when ShivWorks publishes them.</p>
				</div>
			</div>
		{/if}
	</div>
</article>
