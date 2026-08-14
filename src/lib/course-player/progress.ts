import type { CourseModuleEpisodeRecord, CourseModuleRecord } from '$lib/server/db/shivworks';

export type ProgressEntry = {
	currentSeconds: number;
	durationSeconds: number | null;
	completedAt: number | null;
	updatedAt: number;
};

export function getProgressPercent(progress: ProgressEntry | null | undefined): number {
	if (!progress) {
		return 0;
	}

	if (progress.completedAt) {
		return 100;
	}

	if (!progress.durationSeconds || progress.durationSeconds <= 0) {
		return 0;
	}

	return Math.max(
		0,
		Math.min(100, Math.round((progress.currentSeconds / progress.durationSeconds) * 100))
	);
}

export function getProgressState(progress: ProgressEntry | null | undefined): string {
	if (!progress || (!progress.completedAt && progress.currentSeconds <= 0)) {
		return 'Not started';
	}

	if (progress.completedAt) {
		return 'Completed';
	}

	return 'In progress';
}

export function formatResumeLabel(seconds: number): string {
	const totalSeconds = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(totalSeconds / 60)
		.toString()
		.padStart(2, '0');
	const remainingSeconds = (totalSeconds % 60).toString().padStart(2, '0');
	return `${minutes}:${remainingSeconds}`;
}

export function durationLabelToSeconds(label: string | null | undefined): number | null {
	if (!label) {
		return null;
	}

	const trimmed = label.trim();
	const minMatch = /^(\d+)\s*min$/i.exec(trimmed);
	if (minMatch) {
		return Number(minMatch[1]) * 60;
	}

	const parts = trimmed.split(':');
	if (parts.length === 2) {
		const minutes = Number(parts[0]);
		const seconds = Number(parts[1]);
		if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
			return minutes * 60 + seconds;
		}
	}

	return null;
}

export function formatDurationLabel(
	durationSeconds: number | null | undefined,
	durationLabel: string | null | undefined
): string | null {
	if (durationLabel) {
		return durationLabel;
	}

	if (!durationSeconds || durationSeconds <= 0) {
		return null;
	}

	const minutes = Math.max(1, Math.round(durationSeconds / 60));
	return `${minutes} min`;
}

function sumDurationSeconds(values: Array<number | null | undefined>): number | null {
	let total = 0;
	let hasValue = false;

	for (const value of values) {
		if (value && value > 0) {
			total += value;
			hasValue = true;
		}
	}

	return hasValue ? total : null;
}

export function getEpisodeDurationSeconds(
	episode: Pick<CourseModuleEpisodeRecord, 'durationLabel' | 'media'>
): number | null {
	const fromMedia = episode.media?.durationSeconds;
	if (fromMedia && fromMedia > 0) {
		return fromMedia;
	}

	return (
		durationLabelToSeconds(episode.durationLabel) ??
		durationLabelToSeconds(episode.media?.durationLabel ?? null)
	);
}

export function getModuleDurationSeconds(
	module: Pick<CourseModuleRecord, 'id' | 'durationLabel'>,
	episodes: CourseModuleEpisodeRecord[]
): number | null {
	const moduleEpisodes = episodes.filter(
		(episode) => episode.moduleId === module.id && episode.status !== 'archived'
	);

	if (moduleEpisodes.length > 0) {
		const episodeTotal = sumDurationSeconds(moduleEpisodes.map(getEpisodeDurationSeconds));
		if (episodeTotal) {
			return episodeTotal;
		}
	}

	return durationLabelToSeconds(module.durationLabel);
}

export function getCourseDurationSeconds(
	modules: CourseModuleRecord[],
	episodes: CourseModuleEpisodeRecord[]
): number | null {
	const activeModules = modules.filter((module) => module.status !== 'archived');

	return sumDurationSeconds(
		activeModules.map((module) => getModuleDurationSeconds(module, episodes))
	);
}

export function secondsToTotalDurationLabel(seconds: number | null | undefined): string | null {
	if (!seconds || seconds <= 0) {
		return null;
	}

	const totalMinutes = Math.max(1, Math.round(seconds / 60));
	if (totalMinutes < 60) {
		return `${totalMinutes} min`;
	}

	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (minutes === 0) {
		return `${hours} hr`;
	}

	return `${hours} hr ${minutes} min`;
}

/**
 * Whether an episode can be played. Admins may preview a ready episode before
 * it is published so the release path can be verified end to end.
 */
export function canPlayEpisode(episode: CourseModuleEpisodeRecord, isAdmin = false): boolean {
	if (episode.media?.ingestStatus !== 'ready') {
		return false;
	}
	return isAdmin || episode.status === 'available';
}

export function sortEpisodesForModule(
	episodes: CourseModuleEpisodeRecord[]
): CourseModuleEpisodeRecord[] {
	return [...episodes].sort((left, right) => {
		if (left.sortOrder !== right.sortOrder) {
			return left.sortOrder - right.sortOrder;
		}

		return left.episodeNumber - right.episodeNumber;
	});
}

export function getAdjacentEpisodes(
	episodes: CourseModuleEpisodeRecord[],
	episodeId: string | null
): {
	current: CourseModuleEpisodeRecord | null;
	previous: CourseModuleEpisodeRecord | null;
	next: CourseModuleEpisodeRecord | null;
} {
	const ordered = sortEpisodesForModule(episodes);
	const currentIndex = episodeId ? ordered.findIndex((episode) => episode.id === episodeId) : -1;
	const current = currentIndex >= 0 ? ordered[currentIndex] : null;

	return {
		current,
		previous: currentIndex > 0 ? ordered[currentIndex - 1] : null,
		next: currentIndex >= 0 && currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null
	};
}

export type CoursePlayerNavigationTarget =
	| {
			kind: 'module';
			moduleId: string;
			episodeId: null;
			title: string;
	  }
	| {
			kind: 'episode';
			moduleId: string;
			episodeId: string;
			title: string;
	  };

function usesDirectModulePlayback(module: CourseModuleRecord): boolean {
	return Boolean(module.videoUrl || module.id === 'module_origin');
}

export function getCoursePlayerNavigation(options: {
	modules: CourseModuleRecord[];
	episodes: CourseModuleEpisodeRecord[];
	selectedModuleId: string | null;
	selectedEpisodeId: string | null;
	isAdmin?: boolean;
}): {
	previous: CoursePlayerNavigationTarget | null;
	next: CoursePlayerNavigationTarget | null;
} {
	const targets: CoursePlayerNavigationTarget[] = [];
	const orderedModules = [...options.modules]
		.filter((module) => module.status === 'available')
		.sort((left, right) => left.sortOrder - right.sortOrder);

	for (const module of orderedModules) {
		const activeEpisodes = sortEpisodesForModule(
			options.episodes.filter(
				(episode) => episode.moduleId === module.id && episode.status !== 'archived'
			)
		);
		const playableEpisodes = activeEpisodes.filter((episode) =>
			canPlayEpisode(episode, options.isAdmin)
		);
		const directPlayback = usesDirectModulePlayback(module);

		if (directPlayback && activeEpisodes.length <= 1) {
			targets.push({
				kind: 'module',
				moduleId: module.id,
				episodeId: null,
				title: module.title
			});
			continue;
		}

		if (playableEpisodes.length > 0) {
			targets.push(
				...playableEpisodes.map(
					(episode): CoursePlayerNavigationTarget => ({
						kind: 'episode',
						moduleId: module.id,
						episodeId: episode.id,
						title: episode.title
					})
				)
			);
			continue;
		}

		if (directPlayback) {
			targets.push({
				kind: 'module',
				moduleId: module.id,
				episodeId: null,
				title: module.title
			});
		}
	}

	const currentIndex = targets.findIndex(
		(target) =>
			target.moduleId === options.selectedModuleId && target.episodeId === options.selectedEpisodeId
	);

	return {
		previous: currentIndex > 0 ? targets[currentIndex - 1] : null,
		next: currentIndex >= 0 && currentIndex < targets.length - 1 ? targets[currentIndex + 1] : null
	};
}
