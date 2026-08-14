<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import CourseThumbnail from '$lib/components/CourseThumbnail.svelte';
	import { LANDING_CURRICULUM_PLACEHOLDER_SRC } from '$lib/constants/landing';
	import { getCourseArtwork } from '$lib/library/course-artwork';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import type { CourseRecord } from '$lib/server/db/shivworks';

	interface Props {
		course: CourseRecord;
		href?: string;
		locked?: boolean;
		progressBadge?: string;
		progressDetail?: string;
		index?: number;
	}

	let { course, href, locked = false, progressBadge, progressDetail, index }: Props = $props();

	const statusLabel = $derived(
		course.badgeText || (course.status === 'available' ? 'Now available' : 'On roadmap')
	);
	const actionLabel = $derived(
		course.status === 'available'
			? course.completedModuleCount > 0 &&
				course.availableModuleCount > 0 &&
				course.completedModuleCount >= course.availableModuleCount
				? 'Review course'
				: course.startedModuleCount > 0
					? 'Resume course'
					: 'Open course'
			: course.status === 'archived'
				? 'Review archive'
				: 'View roadmap'
	);
	const accessLabel = $derived(getAudienceLabel(course.accessTier));
	const memberState = $derived.by(() => {
		if (course.status !== 'available') return 'Roadmap';
		if (progressBadge) return progressBadge;
		if (
			course.completedModuleCount > 0 &&
			course.availableModuleCount > 0 &&
			course.completedModuleCount >= course.availableModuleCount
		) {
			return 'Completed';
		}
		if (course.startedModuleCount > 0) return 'In progress';
		if (course.availableModuleCount > 0) return 'Ready now';
		return 'Roadmap';
	});
	const tagClass = $derived.by(() => {
		if (memberState === 'Completed') return 'tag brass';
		if (memberState === 'In progress') return 'tag accent';
		if (course.accessTier === 'vip') return 'tag brass';
		return 'tag';
	});
	const courseIndex = $derived(
		index !== undefined
			? String(index + 1).padStart(2, '0')
			: course.sortOrder.toString().padStart(2, '0')
	);
	const artwork = $derived(getCourseArtwork(course));
</script>

{#if href}
	<a class="panel course-card" class:locked {href}>
		<CourseThumbnail
			posterSrc={artwork.comingSoon ? undefined : artwork.posterSrc}
			placeholderSrc={LANDING_CURRICULUM_PLACEHOLDER_SRC}
			label={course.title}
			comingSoon={artwork.comingSoon}
		/>
		<div class="course-card-body">
			<div class="course-card-top">
				<span class="idx">[ Course {courseIndex} ]</span>
				<span class={tagClass}>{memberState}</span>
			</div>
			<h3>{course.title}</h3>
			<p class="cc-desc">{course.description}</p>
			<div class="cc-foot">
				<span class="cc-modules">{accessLabel} · {statusLabel}</span>
				<span class="ghost-link">{actionLabel} <ArrowRight size={14} /></span>
			</div>
			{#if progressDetail}
				<p class="cc-when">{progressDetail}</p>
			{/if}
		</div>
	</a>
{:else}
	<article class="panel course-card" class:locked>
		<CourseThumbnail
			posterSrc={artwork.comingSoon ? undefined : artwork.posterSrc}
			placeholderSrc={LANDING_CURRICULUM_PLACEHOLDER_SRC}
			label={course.title}
			comingSoon={artwork.comingSoon}
		/>
		<div class="course-card-body">
			<div class="course-card-top">
				<span class="idx">[ Course {courseIndex} ]</span>
				<span class={tagClass}>{memberState}</span>
			</div>
			<h3>{course.title}</h3>
			<p class="cc-desc">{course.description}</p>
		</div>
	</article>
{/if}
