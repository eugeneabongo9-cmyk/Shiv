import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { canAccessAudience } from '$lib/constants/tiers';
import { sortEpisodesForModule, canPlayEpisode } from '$lib/course-player/progress';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	getCourseBySlug,
	getMemberModuleNote,
	listCourseModuleEpisodes,
	listCourseModules,
	listCourses,
	listMemberEpisodeProgress,
	listMemberModuleProgress
} from '$lib/server/db/shivworks';
import { requireEntitled } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, params, platform, url }) => {
	const redirectTarget = `/library/${params.slug}`;
	const user = requireEntitled(locals, redirectTarget);
	const db = getDBFromPlatform(platform);
	const course = await getCourseBySlug(db, params.slug);

	if (!course) {
		error(404, 'Course not found');
	}

	const accessLocked = !canAccessAudience(user, course.accessTier);
	const isAdmin = user.role === 'admin';
	const publishedOnly = !isAdmin;
	const modules = await listCourseModules(db, course.id, { publishedOnly });
	const episodes = await listCourseModuleEpisodes(db, {
		courseId: course.id,
		publishedOnly
	});
	const progressEntries = accessLocked ? [] : await listMemberModuleProgress(db, user.clerkUserId);
	const episodeProgressEntries = accessLocked
		? []
		: await listMemberEpisodeProgress(db, user.clerkUserId);
	const progressByModule = Object.fromEntries(
		progressEntries
			.filter((entry) => modules.some((module) => module.id === entry.moduleId))
			.map((entry) => [entry.moduleId, entry])
	);
	const progressByEpisode = Object.fromEntries(
		episodeProgressEntries
			.filter((entry) => episodes.some((episode) => episode.id === entry.episodeId))
			.map((entry) => [entry.episodeId, entry])
	);

	const requestedModuleId = url.searchParams.get('module');
	const requestedEpisodeId = url.searchParams.get('episode');
	const selectedModule =
		modules.find((module) => module.id === requestedModuleId) ||
		modules.find((module) => module.status === 'available') ||
		modules[0] ||
		null;

	const moduleEpisodes = selectedModule
		? sortEpisodesForModule(
				episodes.filter(
					(episode) => episode.moduleId === selectedModule.id && episode.status !== 'archived'
				)
			)
		: [];
	const moduleUsesDirectPlayback = Boolean(
		selectedModule?.videoUrl || selectedModule?.id === 'module_origin'
	);
	const selectedEpisode =
		moduleEpisodes.find((episode) => episode.id === requestedEpisodeId) ||
		(moduleUsesDirectPlayback && moduleEpisodes.length === 1
			? null
			: moduleEpisodes.find((episode) => canPlayEpisode(episode))) ||
		null;

	const moduleNote =
		!accessLocked && selectedModule
			? await getMemberModuleNote(db, user.clerkUserId, selectedModule.id)
			: null;

	const accessibleCourses = accessLocked
		? []
		: (await listCourses(db, user)).filter((item) => item.id !== course.id);
	const nextRecommendedCourse =
		accessibleCourses.find((item) => item.status === 'available') || accessibleCourses[0] || null;

	const availableModules = modules.filter((module) => module.status === 'available');
	const playableEpisodes = episodes.filter(
		(episode) =>
			episode.status === 'available' &&
			availableModules.some((module) => module.id === episode.moduleId) &&
			canPlayEpisode(episode, isAdmin)
	);
	const modulesWithPlayableEpisodes = new Set(playableEpisodes.map((episode) => episode.moduleId));
	const legacyModules = availableModules.filter(
		(module) => !modulesWithPlayableEpisodes.has(module.id)
	);
	const availableProgressUnitCount = playableEpisodes.length + legacyModules.length;
	const completedProgressUnitCount =
		playableEpisodes.filter((episode) => Boolean(progressByEpisode[episode.id]?.completedAt))
			.length +
		legacyModules.filter((module) => Boolean(progressByModule[module.id]?.completedAt)).length;
	const courseCompletionPercent =
		availableProgressUnitCount > 0
			? Math.round((completedProgressUnitCount / availableProgressUnitCount) * 100)
			: 0;
	const courseCompleted =
		availableProgressUnitCount > 0 && completedProgressUnitCount >= availableProgressUnitCount;

	return {
		user,
		course,
		modules,
		episodes,
		progressByModule,
		progressByEpisode,
		selectedModuleId: selectedModule?.id || null,
		selectedEpisodeId: selectedEpisode?.id || null,
		moduleNote,
		accessLocked,
		nextRecommendedCourse,
		courseCompletionPercent,
		courseCompleted
	};
};
