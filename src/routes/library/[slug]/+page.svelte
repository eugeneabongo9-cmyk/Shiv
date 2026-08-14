<script lang="ts">
	import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-svelte';
	import CourseNotesPanel from '$lib/components/course-player/CourseNotesPanel.svelte';
	import CoursePlayerSidebar from '$lib/components/course-player/CoursePlayerSidebar.svelte';
	import CourseStreamPlayer from '$lib/components/course-player/CourseStreamPlayer.svelte';
	import type { CoursePlayback } from '$lib/course-player/types';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import { LANDING_VIDEOS } from '$lib/constants/videos';
	import {
		canPlayEpisode,
		durationLabelToSeconds,
		getCourseDurationSeconds,
		getCoursePlayerNavigation,
		secondsToTotalDurationLabel,
		sortEpisodesForModule,
		type CoursePlayerNavigationTarget,
		type ProgressEntry
	} from '$lib/course-player/progress';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	type Episode = PageData['episodes'][number];

	let { data }: Props = $props();

	// Admins may preview a ready episode before it is published.
	const isAdmin = $derived(data.user.role === 'admin');

	let playback = $state<CoursePlayback | null>(null);
	let playbackError = $state<string | null>(null);
	let loadingPlayback = $state(false);
	let playbackRequestId = 0;

	const selectedModule = $derived(
		data.modules.find((module) => module.id === data.selectedModuleId) || null
	);
	const moduleEpisodes = $derived(
		selectedModule
			? sortEpisodesForModule(
					data.episodes.filter(
						(episode) => episode.moduleId === selectedModule.id && episode.status !== 'archived'
					)
				)
			: []
	);
	const selectedEpisode = $derived(
		moduleEpisodes.find((episode) => episode.id === data.selectedEpisodeId) || null
	);
	const courseNav = $derived(
		getCoursePlayerNavigation({
			modules: data.modules,
			episodes: data.episodes,
			selectedModuleId: data.selectedModuleId,
			selectedEpisodeId: data.selectedEpisodeId,
			isAdmin
		})
	);
	const selectedModuleProgress = $derived(
		selectedModule ? data.progressByModule[selectedModule.id] || null : null
	);
	const selectedEpisodeProgress = $derived(
		selectedEpisode ? data.progressByEpisode[selectedEpisode.id] || null : null
	);
	const activeProgress = $derived<ProgressEntry | null>(
		selectedEpisodeProgress || selectedModuleProgress
	);
	const courseDurationLabel = $derived(
		secondsToTotalDurationLabel(getCourseDurationSeconds(data.modules, data.episodes))
	);
	const canPlayModuleVideo = $derived(
		Boolean(
			!data.accessLocked &&
			selectedModule &&
			selectedModule.status === 'available' &&
			(selectedModule.videoUrl ||
				(selectedModule.id === 'module_origin' && LANDING_VIDEOS.originStoryModule)) &&
			!selectedEpisode
		)
	);
	const moduleCaptionUrl = $derived(
		selectedModule?.id === 'module_core_platform_brief'
			? '/captions/shivworks-member-brief.vtt'
			: '/captions/shivworks-free-preview.vtt'
	);

	function navigationHref(target: CoursePlayerNavigationTarget): string {
		const query = target.episodeId
			? `module=${encodeURIComponent(target.moduleId)}&episode=${encodeURIComponent(target.episodeId)}`
			: `module=${encodeURIComponent(target.moduleId)}`;

		return `/library/${data.course.slug}?${query}`;
	}

	function buildModulePlayback(): CoursePlayback | null {
		const streamUrl =
			selectedModule?.videoUrl ||
			(selectedModule?.id === 'module_origin' ? LANDING_VIDEOS.originStoryModule : null);
		if (!streamUrl) {
			return null;
		}

		if (selectedModule?.id === 'module_origin' || selectedModule?.videoKind === 'embed') {
			return {
				title: selectedModule!.title,
				playbackType: 'embed',
				url: streamUrl,
				embedUrl: streamUrl,
				durationSeconds:
					selectedModuleProgress?.durationSeconds ??
					durationLabelToSeconds(selectedModule?.durationLabel) ??
					null
			};
		}

		return {
			title: selectedModule!.title,
			playbackType: 'mp4',
			url: streamUrl,
			captionUrl: moduleCaptionUrl,
			durationSeconds: selectedModuleProgress?.durationSeconds ?? null
		};
	}

	async function loadEpisodePlayback(episode: Episode, requestId: number) {
		if (data.accessLocked || !canPlayEpisode(episode, isAdmin)) {
			playbackError = 'This episode is not available yet.';
			playback = null;
			return;
		}

		loadingPlayback = true;
		playbackError = null;
		playback = null;

		try {
			const response = await fetch(`/api/library/episodes/${episode.id}/playback`);
			const result = await response.json().catch(() => null);
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || 'Could not load episode playback.');
			}

			if (requestId !== playbackRequestId) {
				return;
			}

			const payload = result.data;
			playback = {
				title: episode.title,
				playbackType:
					payload.playbackType === 'hls'
						? 'hls'
						: payload.playbackType === 'embed'
							? 'embed'
							: 'mp4',
				url: payload.url,
				embedUrl: payload.embedUrl ?? null,
				durationSeconds: payload.durationSeconds ?? episode.media?.durationSeconds ?? null,
				expiresAt: typeof payload.expiresAt === 'number' ? payload.expiresAt : null
			};
		} catch (error) {
			if (requestId !== playbackRequestId) {
				return;
			}
			playback = null;
			playbackError = error instanceof Error ? error.message : 'Could not load episode playback.';
		} finally {
			if (requestId === playbackRequestId) {
				loadingPlayback = false;
			}
		}
	}

	$effect(() => {
		const episode = selectedEpisode;
		const module = selectedModule;
		const locked = data.accessLocked;

		if (locked || !module) {
			playback = null;
			playbackError = null;
			return;
		}

		if (episode) {
			const requestId = ++playbackRequestId;
			void loadEpisodePlayback(episode, requestId);
			return;
		}

		playbackError = null;
		playback = canPlayModuleVideo ? buildModulePlayback() : null;
	});

	// Refresh private Stream tokens before they expire mid-playback.
	$effect(() => {
		const episode = selectedEpisode;
		const expiresAt = playback?.expiresAt;
		if (!episode || !expiresAt || playback?.playbackType !== 'hls') {
			return;
		}

		const refreshInMs = Math.max(5_000, expiresAt * 1000 - Date.now() - 90_000);
		const timer = setTimeout(() => {
			const requestId = ++playbackRequestId;
			void loadEpisodePlayback(episode, requestId);
		}, refreshInMs);

		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>{data.course.title} | ShivWorks Network</title>
</svelte:head>

<main class="course">
	<div class="container">
		<div class="crumb">
			<a href="/library">Library</a>
			<ChevronRight size={14} aria-hidden="true" />
			<span>{data.course.title}</span>
		</div>

		<div class="course-layout">
			<div>
				<div class="panel player">
					<CourseStreamPlayer
						{playback}
						progress={activeProgress}
						loading={loadingPlayback}
						locked={data.accessLocked ||
							(selectedEpisode !== null && !canPlayEpisode(selectedEpisode, isAdmin)) ||
							(selectedModule !== null &&
								selectedEpisode === null &&
								selectedModule.status !== 'available' &&
								!isAdmin)}
						moduleId={selectedEpisode ? null : selectedModule?.id || null}
						episodeId={selectedEpisode?.id || null}
						placeholderTitle={data.accessLocked
							? 'Membership required'
							: selectedEpisode && !canPlayEpisode(selectedEpisode, isAdmin)
								? 'Episode not ready'
								: selectedEpisode
									? 'Playback unavailable'
									: 'Module not live yet'}
						placeholderCopy={data.accessLocked
							? `Upgrade to ${getAudienceLabel(data.course.accessTier)} to watch this course.`
							: 'Playback will appear here when ShivWorks marks this lesson available.'}
					/>

					{#if playbackError}
						<div class="status-message error compact-status">{playbackError}</div>
					{/if}

					{#if selectedModule}
						<div class="course-player-footer">
							{#if courseNav.previous}
								<a class="ghost-link" href={navigationHref(courseNav.previous)}>
									<ArrowLeft size={16} />
									{courseNav.previous.kind === 'episode'
										? 'Previous episode'
										: `Previous: ${courseNav.previous.title}`}
								</a>
							{/if}
							{#if courseNav.next}
								<a class="ghost-link" href={navigationHref(courseNav.next)}>
									{courseNav.next.kind === 'episode'
										? 'Next episode'
										: `Next: ${courseNav.next.title}`}
									<ArrowRight size={16} />
								</a>
							{:else if data.courseCompleted}
								<span class="course-player-note">You have reached the end of this course.</span>
							{:else if selectedModule.status === 'available'}
								<span class="course-player-note">No more available lessons yet.</span>
							{/if}
						</div>
					{/if}
				</div>

				<div class="course-head">
					<div class="meta">
						{#if data.accessLocked}
							<span class="tag muted">{getAudienceLabel(data.course.accessTier)}</span>
						{/if}
						<span class="tag">{data.modules.length} modules</span>
						{#if courseDurationLabel}
							<span class="tag">{courseDurationLabel}</span>
						{/if}
						<span class="tag">{data.courseCompletionPercent}% complete</span>
					</div>
					<h1>{data.course.title}</h1>
					{#if selectedModule}
						<p class="module-now">
							Now playing · {selectedEpisode?.title || selectedModule.title}
						</p>
					{/if}
					<p class="course-desc">{data.course.description}</p>

					{#if data.accessLocked}
						<div class="status-message upgrade-banner">
							<strong>Founding membership required.</strong>
							<span>
								This course is included with Bronze and VIP founding memberships. The module list
								stays visible so you can review the curriculum map.
							</span>
							<a
								class="btn btn-secondary"
								href="/checkout?redirect={encodeURIComponent(`/library/${data.course.slug}`)}"
							>
								Become a founding member
							</a>
						</div>
					{:else if data.courseCompleted}
						<div class="status-message">
							<strong>Course completed.</strong>
							<span>
								You have finished every live module in this course ({data.courseCompletionPercent}%).
							</span>
							{#if data.nextRecommendedCourse}
								<a class="ghost-link" href={`/library/${data.nextRecommendedCourse.slug}`}>
									Continue with {data.nextRecommendedCourse.title}
									<ArrowRight size={16} />
								</a>
							{/if}
						</div>
					{/if}
				</div>

				<div style="margin-top:1.25rem;">
					<CourseNotesPanel
						moduleId={selectedModule?.id || null}
						initialBody={data.moduleNote?.body ?? ''}
						initialUpdatedAt={data.moduleNote?.updatedAt ?? null}
						disabled={data.accessLocked}
					/>
				</div>
			</div>

			<CoursePlayerSidebar
				courseSlug={data.course.slug}
				modules={data.modules}
				episodes={data.episodes}
				selectedModuleId={data.selectedModuleId}
				selectedEpisodeId={data.selectedEpisodeId}
				progressByModule={data.progressByModule}
				progressByEpisode={data.progressByEpisode}
				member={data.user}
				accessLocked={data.accessLocked}
				courseCompletionPercent={data.courseCompletionPercent}
			/>
		</div>
	</div>
</main>
