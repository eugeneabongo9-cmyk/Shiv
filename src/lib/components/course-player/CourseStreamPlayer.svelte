<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { CheckCircle2, Lock } from 'lucide-svelte';
	import { formatDurationLabel, formatResumeLabel } from '$lib/course-player/progress';
	import {
		isCloudflareStreamEmbedUrl,
		loadCloudflareStreamSdk,
		type CloudflareStreamPlayer
	} from '$lib/course-player/stream-sdk';
	import type { CoursePlayback, PlaybackProgress } from '$lib/course-player/types';

	interface Props {
		playback: CoursePlayback | null;
		progress?: PlaybackProgress | null;
		locked?: boolean;
		loading?: boolean;
		placeholderTitle?: string;
		placeholderCopy?: string;
		loadingTitle?: string;
		loadingCopy?: string;
		moduleId?: string | null;
		episodeId?: string | null;
	}

	let {
		playback = null,
		progress = null,
		locked = false,
		loading = false,
		placeholderTitle = 'Playback unavailable',
		placeholderCopy = 'This lesson is not ready for playback yet.',
		loadingTitle = 'Loading playback',
		loadingCopy = 'Preparing your lesson…',
		moduleId = null,
		episodeId = null
	}: Props = $props();

	let playerElement = $state<HTMLVideoElement | null>(null);
	let streamIframe = $state<HTMLIFrameElement | null>(null);
	let saveFeedback = $state<string | null>(null);
	let lastSavedSeconds = 0;
	let restored = false;
	let saveErrorResetTimer: ReturnType<typeof setTimeout> | null = null;
	let streamProgressBootstrapped = false;
	let markingComplete = $state(false);
	let localCompletedAt = $state<number | null>(null);
	let streamCurrentSeconds = $state(0);
	let streamDurationSeconds = $state<number | null>(null);

	let streamPlayer: CloudflareStreamPlayer | null = null;
	let streamListeners: Array<{ event: string; listener: (...args: unknown[]) => void }> = [];

	const effectiveCompletedAt = $derived(localCompletedAt ?? progress?.completedAt ?? null);

	const progressPercent = $derived.by(() => {
		if (effectiveCompletedAt) {
			return 100;
		}

		const durationSeconds =
			streamDurationSeconds ?? playback?.durationSeconds ?? progress?.durationSeconds ?? null;
		const currentSeconds = streamCurrentSeconds || progress?.currentSeconds || 0;

		if (!durationSeconds || durationSeconds <= 0) {
			return 0;
		}

		return Math.max(0, Math.min(100, Math.round((currentSeconds / durationSeconds) * 100)));
	});

	const durationLabel = $derived(
		formatDurationLabel(
			streamDurationSeconds ?? playback?.durationSeconds ?? progress?.durationSeconds,
			null
		)
	);

	const usesStreamIframe = $derived(
		playback?.playbackType === 'hls' || playback?.playbackType === 'embed'
	);

	const streamEmbedUrl = $derived.by(() => {
		const base = playback?.embedUrl || (playback?.playbackType === 'embed' ? playback.url : null);
		if (!base) {
			return null;
		}

		const resumeSeconds =
			progress && !effectiveCompletedAt && progress.currentSeconds > 3
				? progress.currentSeconds
				: 0;
		const separator = base.includes('?') ? '&' : '?';
		return resumeSeconds > 0 ? `${base}${separator}startTime=${Math.floor(resumeSeconds)}` : base;
	});

	function getProgressEndpoint(): string | null {
		if (episodeId) {
			return `/api/library/episodes/${episodeId}/progress`;
		}

		if (moduleId) {
			return `/api/library/modules/${moduleId}/progress`;
		}

		return null;
	}

	function clearSaveFeedbackSoon() {
		if (saveErrorResetTimer) {
			clearTimeout(saveErrorResetTimer);
		}

		saveErrorResetTimer = setTimeout(() => {
			saveFeedback = null;
		}, 2200);
	}

	function detachStreamPlayer() {
		if (streamPlayer) {
			for (const { event, listener } of streamListeners) {
				streamPlayer.removeEventListener?.(event, listener);
			}
		}
		streamListeners = [];
		streamPlayer = null;
	}

	async function persistProgress(
		force = false,
		completed = false,
		currentSecondsOverride?: number
	) {
		const endpoint = getProgressEndpoint();
		if (!endpoint || locked) {
			return false;
		}

		const currentSeconds =
			currentSecondsOverride ??
			(playerElement
				? Math.max(0, Math.round(playerElement.currentTime || 0))
				: streamPlayer
					? Math.max(0, Math.round(streamPlayer.currentTime || streamCurrentSeconds || 0))
					: progress?.currentSeconds || 0);
		const durationSeconds =
			playerElement?.duration && Number.isFinite(playerElement.duration)
				? Math.round(playerElement.duration)
				: streamPlayer?.duration && Number.isFinite(streamPlayer.duration)
					? Math.round(streamPlayer.duration)
					: (streamDurationSeconds ??
						playback?.durationSeconds ??
						progress?.durationSeconds ??
						null);

		if (!force && !completed && Math.abs(currentSeconds - lastSavedSeconds) < 10) {
			return false;
		}

		lastSavedSeconds = currentSeconds;

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentSeconds,
					durationSeconds,
					completed
				})
			});

			if (!response.ok) {
				const result = await response.json().catch(() => ({ error: 'Unable to save progress.' }));
				saveFeedback = result.error || 'Unable to save progress.';
				clearSaveFeedbackSoon();
				return false;
			}

			if (completed) {
				localCompletedAt = Date.now();
				saveFeedback = 'Lesson marked complete.';
				clearSaveFeedbackSoon();
				await invalidateAll();
			}

			return true;
		} catch {
			saveFeedback = 'Unable to save progress.';
			clearSaveFeedbackSoon();
			return false;
		}
	}

	function restorePlaybackPosition() {
		if (!playerElement || !progress || effectiveCompletedAt || restored) {
			return;
		}

		if (progress.currentSeconds <= 3) {
			lastSavedSeconds = progress.currentSeconds;
			restored = true;
			return;
		}

		const safeResumePoint =
			playerElement.duration && progress.currentSeconds >= playerElement.duration - 4
				? Math.max(0, Math.round(playerElement.duration) - 6)
				: progress.currentSeconds;

		playerElement.currentTime = safeResumePoint;
		lastSavedSeconds = safeResumePoint;
		restored = true;
	}

	function handleLoadedMetadata() {
		restorePlaybackPosition();
	}

	function handleTimeUpdate() {
		void persistProgress(false, false);
	}

	function handlePause() {
		void persistProgress(true, false);
	}

	function handleEnded() {
		const durationSeconds =
			playerElement?.duration && Number.isFinite(playerElement.duration)
				? Math.round(playerElement.duration)
				: (playback?.durationSeconds ?? progress?.durationSeconds ?? null);
		void persistProgress(true, true, durationSeconds || playerElement?.currentTime || 0);
	}

	async function markCompleteManually() {
		if (markingComplete || effectiveCompletedAt) {
			return;
		}

		markingComplete = true;
		try {
			const durationSeconds =
				streamDurationSeconds ??
				playback?.durationSeconds ??
				progress?.durationSeconds ??
				streamCurrentSeconds ??
				progress?.currentSeconds ??
				1;
			await persistProgress(true, true, Math.max(1, Math.round(durationSeconds)));
		} finally {
			markingComplete = false;
		}
	}

	function attachStreamListeners(player: CloudflareStreamPlayer) {
		const onTimeUpdate = () => {
			streamCurrentSeconds = Math.max(0, Math.round(player.currentTime || 0));
			if (Number.isFinite(player.duration) && player.duration > 0) {
				streamDurationSeconds = Math.round(player.duration);
			}
			void persistProgress(false, false, streamCurrentSeconds);
		};
		const onPause = () => {
			streamCurrentSeconds = Math.max(0, Math.round(player.currentTime || 0));
			void persistProgress(true, false, streamCurrentSeconds);
		};
		const onEnded = () => {
			const durationSeconds =
				Number.isFinite(player.duration) && player.duration > 0
					? Math.round(player.duration)
					: (streamDurationSeconds ??
						playback?.durationSeconds ??
						progress?.durationSeconds ??
						Math.round(player.currentTime || 0));
			streamDurationSeconds = durationSeconds;
			streamCurrentSeconds = durationSeconds;
			void persistProgress(true, true, durationSeconds);
		};

		player.addEventListener('timeupdate', onTimeUpdate);
		player.addEventListener('pause', onPause);
		player.addEventListener('ended', onEnded);
		streamListeners = [
			{ event: 'timeupdate', listener: onTimeUpdate },
			{ event: 'pause', listener: onPause },
			{ event: 'ended', listener: onEnded }
		];
	}

	$effect(() => {
		void playback;
		void episodeId;
		void moduleId;
		restored = false;
		streamProgressBootstrapped = false;
		lastSavedSeconds = progress?.currentSeconds || 0;
		localCompletedAt = null;
		streamCurrentSeconds = progress?.currentSeconds || 0;
		streamDurationSeconds = progress?.durationSeconds ?? playback?.durationSeconds ?? null;
		saveFeedback = null;
		detachStreamPlayer();
	});

	$effect(() => {
		if (
			!streamProgressBootstrapped &&
			usesStreamIframe &&
			(streamEmbedUrl || playback?.url) &&
			!effectiveCompletedAt
		) {
			streamProgressBootstrapped = true;
			void persistProgress(true, false, Math.max(progress?.currentSeconds || 0, 1));
		}
	});

	$effect(() => {
		const iframe = streamIframe;
		const embedUrl = streamEmbedUrl || playback?.url || null;
		if (!iframe || !usesStreamIframe || !isCloudflareStreamEmbedUrl(embedUrl)) {
			detachStreamPlayer();
			return;
		}

		let cancelled = false;

		void (async () => {
			try {
				const Stream = await loadCloudflareStreamSdk();
				if (cancelled || !streamIframe) {
					return;
				}
				detachStreamPlayer();
				streamPlayer = Stream(streamIframe);
				attachStreamListeners(streamPlayer);
			} catch (error) {
				console.warn('[course-player] Stream SDK unavailable; use Mark complete.', error);
			}
		})();

		return () => {
			cancelled = true;
			detachStreamPlayer();
		};
	});

	onDestroy(() => {
		if (saveErrorResetTimer) {
			clearTimeout(saveErrorResetTimer);
		}

		detachStreamPlayer();
		// Sticky completed_at in D1 keeps prior completion even when this save is incomplete.
		void persistProgress(true, false);
	});
</script>

<div class="course-player-surface">
	{#if locked}
		<div class="course-player-placeholder">
			<Lock size={20} />
			<strong>{placeholderTitle}</strong>
			<p>{placeholderCopy}</p>
		</div>
	{:else if loading}
		<div class="course-player-placeholder course-player-placeholder--loading" aria-busy="true">
			<strong>{loadingTitle}</strong>
			<p>{loadingCopy}</p>
		</div>
	{:else if playback}
		<div class="course-player-header">
			<p class="eyebrow">Now playing</p>
			<h2>{playback.title}</h2>
			{#if durationLabel || progress || effectiveCompletedAt}
				<div class="course-player-meta">
					{#if durationLabel}
						<span class="detail-pill muted">{durationLabel}</span>
					{/if}
					{#if progress || effectiveCompletedAt}
						<span class="detail-pill">
							{effectiveCompletedAt ? 'Completed' : `${progressPercent}% watched`}
						</span>
					{/if}
				</div>
			{/if}
		</div>

		{#if playback.playbackType === 'hls' && streamEmbedUrl}
			<div class="embed-shell course-embed-shell course-stream-embed">
				<iframe
					bind:this={streamIframe}
					title={`Stream playback for ${playback.title}`}
					src={streamEmbedUrl}
					loading="lazy"
					allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
					allowfullscreen
				></iframe>
			</div>
		{:else if playback.playbackType === 'embed'}
			<div class="embed-shell course-embed-shell">
				<iframe
					bind:this={streamIframe}
					title={`Playback for ${playback.title}`}
					src={streamEmbedUrl || playback.url}
					loading="lazy"
					allow="autoplay; fullscreen; picture-in-picture; accelerometer; gyroscope; encrypted-media"
					allowfullscreen
				></iframe>
			</div>
		{:else}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				class="course-video"
				src={playback.url}
				bind:this={playerElement}
				controls
				playsinline
				preload="metadata"
				onloadedmetadata={handleLoadedMetadata}
				ontimeupdate={handleTimeUpdate}
				onpause={handlePause}
				onended={handleEnded}
			>
				{#if playback.captionUrl}
					<track
						kind="captions"
						src={playback.captionUrl}
						srclang="en"
						label="English captions"
						default
					/>
				{/if}
				<p>Your browser does not support embedded video playback.</p>
			</video>
		{/if}

		{#if usesStreamIframe && !effectiveCompletedAt}
			<div class="course-player-complete-row">
				<p class="course-player-note">
					Progress saves while you watch. If completion does not flip automatically after the video
					ends, mark it complete here.
				</p>
				<button
					type="button"
					class="btn btn-secondary"
					disabled={markingComplete}
					onclick={() => markCompleteManually()}
				>
					<CheckCircle2 size={16} />
					{markingComplete ? 'Saving…' : 'Mark lesson complete'}
				</button>
			</div>
		{:else if progress && !effectiveCompletedAt && progress.currentSeconds > 0 && playback.playbackType !== 'hls'}
			<p class="course-player-note">
				Resume from {formatResumeLabel(progress.currentSeconds)}. Progress saves automatically.
			</p>
		{/if}
	{:else}
		<div class="course-player-placeholder">
			<Lock size={20} />
			<strong>{placeholderTitle}</strong>
			<p>{placeholderCopy}</p>
		</div>
	{/if}

	{#if saveFeedback}
		<div
			class="status-message compact-status"
			class:error={!effectiveCompletedAt || !saveFeedback.includes('complete')}
			role="status"
		>
			{saveFeedback}
		</div>
	{/if}
</div>

<style>
	.course-player-surface {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.course-player-complete-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.85rem 1rem;
	}

	.course-player-complete-row .course-player-note {
		margin: 0;
		flex: 1 1 16rem;
	}
</style>
