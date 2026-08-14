<script lang="ts">
	import { CheckCircle2, Lock, PlayCircle } from 'lucide-svelte';
	import CourseThumbnail from '$lib/components/CourseThumbnail.svelte';
	import { LANDING_CURRICULUM_PLACEHOLDER_SRC } from '$lib/constants/landing';
	import { canAccessAudience } from '$lib/constants/tiers';
	import { getModuleArtwork } from '$lib/library/course-artwork';
	import {
		canPlayEpisode,
		formatDurationLabel,
		getEpisodeDurationSeconds,
		getModuleDurationSeconds,
		getProgressPercent,
		getProgressState,
		secondsToTotalDurationLabel,
		sortEpisodesForModule,
		type ProgressEntry
	} from '$lib/course-player/progress';
	import type { CourseModuleEpisodeRecord, CourseModuleRecord } from '$lib/server/db/shivworks';
	import type { MemberRecord } from '$lib/server/db/shivworks';

	interface Props {
		courseSlug: string;
		modules: CourseModuleRecord[];
		episodes: CourseModuleEpisodeRecord[];
		selectedModuleId: string | null;
		selectedEpisodeId: string | null;
		progressByModule: Record<string, ProgressEntry>;
		progressByEpisode: Record<string, ProgressEntry>;
		member: MemberRecord;
		accessLocked: boolean;
		courseCompletionPercent?: number;
	}

	let {
		courseSlug,
		modules,
		episodes,
		selectedModuleId,
		selectedEpisodeId,
		progressByModule,
		progressByEpisode,
		member,
		accessLocked,
		courseCompletionPercent = 0
	}: Props = $props();

	const completedModuleCount = $derived(
		modules.filter((module) => progressByModule[module.id]?.completedAt).length
	);
	// Admins may preview ready-but-unpublished content, so the sidebar
	// shouldn't show a misleading lock icon on what they're about to open.
	const isAdmin = $derived(member.role === 'admin');

	function moduleHref(moduleId: string, episodeId?: string | null): string {
		const query = episodeId
			? `module=${encodeURIComponent(moduleId)}&episode=${encodeURIComponent(episodeId)}`
			: `module=${encodeURIComponent(moduleId)}`;

		return `/library/${courseSlug}?${query}`;
	}

	function isModuleLocked(module: CourseModuleRecord): boolean {
		return (
			accessLocked ||
			(module.status !== 'available' && !isAdmin) ||
			!canAccessAudience(member, module.accessTier)
		);
	}

	function shouldShowModuleEpisodes(
		module: CourseModuleRecord,
		moduleEpisodes: CourseModuleEpisodeRecord[],
		isSelected: boolean
	): boolean {
		if (!isSelected || moduleEpisodes.length === 0) {
			return false;
		}

		if (moduleEpisodes.length === 1 && (module.videoUrl || module.id === 'module_origin')) {
			return false;
		}

		return true;
	}

	function isEpisodeLocked(episode: CourseModuleEpisodeRecord): boolean {
		return (
			accessLocked ||
			!canAccessAudience(member, episode.accessTier) ||
			!canAccessAudience(member, episode.courseAccessTier) ||
			!canPlayEpisode(episode, isAdmin)
		);
	}
</script>

<aside class="panel sidebar" aria-label="Course modules">
	<div class="sidebar-head">
		<h3>Course modules</h3>
		<span class="count">
			{String(completedModuleCount).padStart(2, '0')} / {String(modules.length).padStart(2, '0')}
		</span>
	</div>

	<ul class="module-list">
		{#each modules as module (module.id)}
			{@const moduleEpisodes = sortEpisodesForModule(
				episodes.filter(
					(episode) => episode.moduleId === module.id && episode.status !== 'archived'
				)
			)}
			{@const moduleProgress = progressByModule[module.id]}
			{@const isSelected = module.id === selectedModuleId}
			{@const moduleArtwork = getModuleArtwork(module)}
			{@const moduleDuration = secondsToTotalDurationLabel(
				getModuleDurationSeconds(module, episodes)
			)}
			<li class="module-item" class:active={isSelected && !selectedEpisodeId}>
				<a class="module-link" href={moduleHref(module.id)}>
					<div class="module-link-thumb" aria-hidden="true">
						<CourseThumbnail
							posterSrc={moduleArtwork.comingSoon ? undefined : moduleArtwork.posterSrc}
							placeholderSrc={LANDING_CURRICULUM_PLACEHOLDER_SRC}
							label={module.title}
							comingSoon={moduleArtwork.comingSoon}
						/>
					</div>
					<div class="module-link-main">
						<span class="module-idx">{String(module.sortOrder).padStart(2, '0')}</span>
						<div>
							<strong>{module.title}</strong>
							{#if moduleDuration}
								<span class="module-dur">{moduleDuration}</span>
							{/if}
						</div>
					</div>
					<span class="module-state">
						{#if isModuleLocked(module)}
							<Lock size={14} />
						{:else if moduleProgress?.completedAt}
							<CheckCircle2 size={14} />
						{:else if isSelected}
							<PlayCircle size={14} />
						{/if}
					</span>
				</a>

				{#if shouldShowModuleEpisodes(module, moduleEpisodes, isSelected)}
					<ul class="module-list module-episodes">
						{#each moduleEpisodes as episode (episode.id)}
							{@const episodeProgress = progressByEpisode[episode.id]}
							{@const episodeDuration = formatDurationLabel(
								getEpisodeDurationSeconds(episode),
								episode.durationLabel ?? episode.media?.durationLabel
							)}
							<li class="module-item" class:active={episode.id === selectedEpisodeId}>
								<a class="module-link" href={moduleHref(module.id, episode.id)}>
									<div class="module-link-main">
										<span class="module-idx">{String(episode.episodeNumber).padStart(2, '0')}</span>
										<div>
											<strong>{episode.title}</strong>
											{#if episodeDuration}
												<span class="module-dur">{episodeDuration}</span>
											{/if}
										</div>
									</div>
									<span class="module-state">
										{#if isEpisodeLocked(episode)}
											<Lock size={14} />
										{:else if episodeProgress?.completedAt}
											<CheckCircle2 size={14} />
										{:else if episode.id === selectedEpisodeId}
											<PlayCircle size={14} />
										{/if}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>

	<div class="sidebar-progress">
		<div class="row">
			<span>Course progress</span>
			<span>{courseCompletionPercent}%</span>
		</div>
		<div class="progress-track">
			<div class="progress-fill" style:width="{courseCompletionPercent}%"></div>
		</div>
		{#if selectedModuleId && progressByModule[selectedModuleId]}
			<p class="module-state-copy">
				{getProgressState(progressByModule[selectedModuleId])}
				{#if !progressByModule[selectedModuleId]?.completedAt}
					· {getProgressPercent(progressByModule[selectedModuleId])}%
				{/if}
			</p>
		{/if}
	</div>
</aside>

<style>
	:global(.module-item) {
		flex-direction: column;
		align-items: stretch;
	}

	:global(.module-item.active) {
		background: var(--color-accent-soft);
	}

	.module-link {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
		color: inherit;
		text-decoration: none;
	}

	.module-link-main {
		display: flex;
		align-items: flex-start;
		gap: 0.55rem;
		flex: 1;
		min-width: 0;
	}

	.module-link-thumb {
		flex: 0 0 4.5rem;
		width: 4.5rem;
		border-radius: 4px;
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.module-link-thumb :global(.course-thumb) {
		aspect-ratio: 16 / 9;
		border-bottom: 0;
	}

	.module-link-thumb :global(.course-thumb-label) {
		font-size: 0.42rem;
		padding: 0.2rem 0.35rem;
		letter-spacing: 0.06em;
	}

	.module-episodes {
		padding-left: 0.85rem;
		margin-top: 0.35rem;
	}

	.module-state-copy {
		margin: 0.65rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.module-dur {
		display: block;
		margin-top: 0.2rem;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-fg-faint);
	}
</style>
