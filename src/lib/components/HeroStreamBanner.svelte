<script lang="ts">
	import { Play } from 'lucide-svelte';

	interface Props {
		videoSrc: string;
		posterSrc: string;
		label: string;
		onExpand?: (() => void) | undefined;
	}

	let { videoSrc, posterSrc, label, onExpand }: Props = $props();

	const embedSrc = $derived(
		videoSrc.includes('?')
			? `${videoSrc}&autoplay=true&muted=true&loop=true&controls=false`
			: `${videoSrc}?autoplay=true&muted=true&loop=true&controls=false`
	);
</script>

<div class="hero-stream-banner">
	<div class="embed-shell hero-stream-embed">
		<img class="hero-stream-poster" src={posterSrc} alt="" loading="eager" decoding="async" />
		<iframe
			title={label}
			src={embedSrc}
			loading="eager"
			allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
			allowfullscreen
		></iframe>
	</div>
	{#if onExpand}
		<button type="button" class="hero-stream-play" onclick={onExpand} aria-label={label}>
			<span class="hero-stream-play-btn" aria-hidden="true">
				<Play size={24} />
			</span>
		</button>
		<button
			type="button"
			class="hero-stream-expand"
			onclick={onExpand}
			aria-label="Watch with sound"
		>
			<span class="hero-stream-expand-label">Watch with sound</span>
		</button>
	{/if}
</div>
