<script lang="ts">
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import { MEMBERSHIP_TIERS } from '$lib/constants/tiers';
	import type { MembershipTier } from '$lib/constants/tiers';
	import type { UpcomingCountdown } from '$lib/upcoming/types';

	type DashboardNextEvent = {
		title: string;
		startsAt: number | null;
		status: 'scheduled' | 'live' | 'ended';
	};

	interface Props {
		name: string;
		tier: MembershipTier | null;
		countdown: UpcomingCountdown;
		nextEvent: DashboardNextEvent | null;
		trainingPoints: number;
		streakDays: number;
		rank: string | null;
	}

	let { name, tier, countdown, nextEvent, trainingPoints, streakDays, rank }: Props = $props();

	const tierMeta = $derived(tier ? MEMBERSHIP_TIERS[tier] : null);
	const rankLabel = $derived(rank ?? 'Recruit');
	const streakLabel = $derived(
		streakDays === 0 ? 'No active streak' : streakDays === 1 ? '1 day' : `${streakDays} days`
	);

	function formatEventWhen(startsAt: number | null, status: DashboardNextEvent['status']): string {
		if (status === 'live') return 'Live now';
		if (!startsAt) return 'Date TBA';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(startsAt));
	}
</script>

<header class="panel dashboard-hub-hero">
	<div class="dashboard-hub-hero-main">
		<p class="eyebrow">Member hub</p>
		<div class="dashboard-hub-hero-title">
			<h1>Welcome back, {name}.</h1>
			<MembershipBadge {tier} />
		</div>
		{#if tierMeta}
			<p class="dashboard-hub-hero-lead">{tierMeta.description}</p>
		{/if}
	</div>

	<div class="signal-grid dashboard-hub-signals">
		<div class="signal-tile">
			<span class="signal-label">Next content drop</span>
			<strong class="signal-value signal-value--text">{countdown.label}</strong>
			<p>{countdown.detail}</p>
		</div>
		<div class="signal-tile">
			<span class="signal-label">Next live event</span>
			<strong class="signal-value signal-value--text">
				{nextEvent ? nextEvent.title : 'None scheduled'}
			</strong>
			<p>
				{#if nextEvent}
					{formatEventWhen(nextEvent.startsAt, nextEvent.status)}
				{:else}
					The Live lane will show your next touchpoint when it is scheduled.
				{/if}
			</p>
		</div>
		<div class="signal-tile">
			<span class="signal-label">Training points</span>
			<strong class="signal-value">{trainingPoints.toLocaleString()}</strong>
			<p>Rank · {rankLabel}</p>
		</div>
		<div class="signal-tile">
			<span class="signal-label">Current streak</span>
			<strong class="signal-value">{streakLabel}</strong>
			<p>Points and streaks grow as you train and attend live sessions.</p>
		</div>
	</div>
</header>
