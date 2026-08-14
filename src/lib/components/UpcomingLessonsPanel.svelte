<script lang="ts">
	import WelcomeCountdown from '$lib/components/WelcomeCountdown.svelte';
	import type { UpcomingTracker } from '$lib/upcoming/types';

	interface Props {
		tracker: UpcomingTracker;
		heading?: string;
		showCountdown?: boolean;
	}

	let { tracker, heading = 'Upcoming content', showCountdown = true }: Props = $props();
</script>

{#if showCountdown}
	<WelcomeCountdown countdown={tracker.countdown} />
{/if}

{#if tracker.upcoming.length > 0}
	<div class="welcome-expect-block">
		<p class="card-eyebrow">{heading}</p>
		<div class="welcome-upcoming-list">
			{#each tracker.upcoming as item}
				<div class="welcome-upcoming-row">
					<div>
						<strong>{item.title}</strong>
						<p>{item.detail}</p>
					</div>
					<span class="welcome-upcoming-date">{item.releaseLabel}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
