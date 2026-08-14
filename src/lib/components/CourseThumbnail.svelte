<script lang="ts">
	import TrailerTile from '$lib/components/TrailerTile.svelte';

	interface Props {
		posterSrc?: string;
		placeholderSrc: string;
		label: string;
		comingSoon?: boolean;
		onPlay?: (() => void) | undefined;
	}

	let { posterSrc, placeholderSrc, label, comingSoon = false, onPlay }: Props = $props();
</script>

{#if comingSoon}
	<div class="course-thumb course-thumb--soon" aria-label="{label} — coming soon">
		<img src={placeholderSrc} alt="" loading="lazy" decoding="async" />
		<div class="course-thumb-scrim" aria-hidden="true"></div>
		<span class="course-thumb-label">Coming Soon</span>
	</div>
{:else if onPlay && posterSrc}
	<TrailerTile {posterSrc} {label} class="trailer-tile-course" {onPlay} />
{:else if posterSrc}
	<div class="course-thumb" aria-label={label}>
		<img src={posterSrc} alt="" loading="lazy" decoding="async" />
	</div>
{:else}
	<div class="course-thumb course-thumb--soon" aria-label="{label} — coming soon">
		<img src={placeholderSrc} alt="" loading="lazy" decoding="async" />
		<div class="course-thumb-scrim" aria-hidden="true"></div>
		<span class="course-thumb-label">Coming Soon</span>
	</div>
{/if}
