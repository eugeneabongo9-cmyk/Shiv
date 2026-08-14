<script lang="ts">
	import { Play } from 'lucide-svelte';

	interface Props {
		posterSrc: string;
		label: string;
		/** Pass undefined when no video is ready yet — tile shows poster but is not clickable. */
		onPlay?: (() => void) | undefined;
		class?: string;
		tape?: string;
	}

	let { posterSrc, label, onPlay, class: className = '', tape }: Props = $props();
</script>

{#if onPlay}
	<button type="button" class="trailer-tile {className}" onclick={onPlay} aria-label={label}>
		{#if tape}
			<span class="trailer-tile-tape">{tape}</span>
		{/if}
		<img class="trailer-tile-poster" src={posterSrc} alt="" loading="lazy" decoding="async" />
		<div class="trailer-tile-scrim" aria-hidden="true"></div>
		<span class="trailer-tile-play" aria-hidden="true">
			<span class="trailer-tile-play-btn">
				<Play size={24} />
			</span>
		</span>
	</button>
{:else}
	<div class="trailer-tile {className}" aria-label={label}>
		{#if tape}
			<span class="trailer-tile-tape">{tape}</span>
		{/if}
		<img class="trailer-tile-poster" src={posterSrc} alt="" loading="lazy" decoding="async" />
		<div class="trailer-tile-scrim" aria-hidden="true"></div>
		<span class="trailer-tile-coming" aria-hidden="true">
			<span class="trailer-tile-coming-label">Video coming soon</span>
		</span>
	</div>
{/if}
