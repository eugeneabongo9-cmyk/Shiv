<script lang="ts">
	import { onMount } from 'svelte';
	import type { UpcomingCountdown } from '$lib/upcoming/types';

	interface Props {
		countdown: UpcomingCountdown;
	}

	let { countdown }: Props = $props();

	type CountdownParts = {
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
		complete: boolean;
	};

	let parts = $state<CountdownParts>({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
		complete: false
	});

	function computeParts(targetAt: number | null): CountdownParts {
		if (!targetAt) {
			return { days: 0, hours: 0, minutes: 0, seconds: 0, complete: true };
		}

		const remaining = Math.max(0, targetAt - Date.now());
		if (remaining <= 0) {
			return { days: 0, hours: 0, minutes: 0, seconds: 0, complete: true };
		}

		const totalSeconds = Math.floor(remaining / 1000);
		const days = Math.floor(totalSeconds / 86_400);
		const hours = Math.floor((totalSeconds % 86_400) / 3_600);
		const minutes = Math.floor((totalSeconds % 3_600) / 60);
		const seconds = totalSeconds % 60;

		return { days, hours, minutes, seconds, complete: false };
	}

	function pad(value: number): string {
		return String(value).padStart(2, '0');
	}

	onMount(() => {
		const refresh = () => {
			parts = computeParts(countdown.targetAt);
		};

		refresh();
		const intervalId = setInterval(refresh, 1000);
		return () => clearInterval(intervalId);
	});
</script>

<div class="welcome-countdown">
	<div class="welcome-countdown-copy">
		<p class="card-eyebrow">Next scheduled drop</p>
		<strong>{countdown.label}</strong>
		<p>{countdown.detail}</p>
	</div>

	{#if !countdown.targetAt}
		<p class="welcome-countdown-fallback">
			Dates are being staged — check the Live lane for the first session.
		</p>
	{:else if parts.complete}
		<p class="welcome-countdown-live">
			This touchpoint is live or just opened — open the Live or Library lane.
		</p>
	{:else}
		<div class="welcome-countdown-grid" aria-live="polite">
			<div>
				<span class="welcome-countdown-value">{parts.days}</span>
				<span class="welcome-countdown-unit">Days</span>
			</div>
			<div>
				<span class="welcome-countdown-value">{pad(parts.hours)}</span>
				<span class="welcome-countdown-unit">Hours</span>
			</div>
			<div>
				<span class="welcome-countdown-value">{pad(parts.minutes)}</span>
				<span class="welcome-countdown-unit">Min</span>
			</div>
			<div>
				<span class="welcome-countdown-value">{pad(parts.seconds)}</span>
				<span class="welcome-countdown-unit">Sec</span>
			</div>
		</div>
	{/if}
</div>
