<script lang="ts">
	import { X } from 'lucide-svelte';

	interface Props {
		/** Platform video URL. Supports Cloudflare Stream embeds or local MP4 paths. */
		videoSrc: string;
		title: string;
		onClose: () => void;
	}

	let { videoSrc, title, onClose }: Props = $props();

	const isStreamEmbed = $derived(videoSrc.includes('cloudflarestream.com'));

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let videoEl = $state<HTMLVideoElement | null>(null);

	$effect(() => {
		const dialog = dialogEl;
		if (!dialog) return;

		dialog.showModal();
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
			if (videoEl) {
				videoEl.pause();
				videoEl.removeAttribute('src');
				videoEl.load();
			}
			if (dialog.open) dialog.close();
		};
	});

	$effect(() => {
		const video = videoEl;
		const src = videoSrc;
		if (!video || !src || isStreamEmbed) return;
		video.src = src;
		video.load();
		void video.play().catch(() => {});
	});

	function handleCancel(event: Event) {
		event.preventDefault();
		onClose();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === dialogEl) onClose();
	}
</script>

<dialog
	bind:this={dialogEl}
	class="trailer-modal-dialog"
	aria-label={title}
	oncancel={handleCancel}
	onclick={handleBackdropClick}
>
	<div class="trailer-modal">
		<div class="trailer-modal-head">
			<p class="trailer-modal-title">{title}</p>
			<button type="button" class="trailer-modal-close" onclick={onClose} aria-label="Close video">
				<X size={20} />
			</button>
		</div>
		<div class="trailer-modal-player">
			{#if isStreamEmbed}
				<iframe
					src="{videoSrc}?autoplay=true&muted=false"
					{title}
					allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
					allowfullscreen
					class="trailer-modal-embed"
				></iframe>
			{:else}
				<video
					bind:this={videoEl}
					class="trailer-modal-video"
					{title}
					controls
					playsinline
					preload="metadata"
				></video>
			{/if}
		</div>
	</div>
</dialog>
