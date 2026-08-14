<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import LibraryCatalog from '$lib/components/library/LibraryCatalog.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Resume panel. Derived from the same record the dashboard uses, and
	// deliberately from its own fields rather than the dashboard's snapshot:
	// buildDashboardActivitySnapshot() also needs gamification, events and RSVP
	// data this page has no reason to load. Title and link follow the same
	// convention as src/lib/server/dashboard.ts so the two never disagree.
	const resume = $derived(data.resumeItem);
	const firstCourse = $derived(data.courses[0] ?? null);
	const resumeHref = $derived(
		resume
			? `/library/${resume.courseSlug}?module=${resume.moduleId}`
			: firstCourse
				? `/library/${firstCourse.slug}`
				: '/library'
	);
	const resumeTitle = $derived(resume?.moduleTitle ?? firstCourse?.title ?? null);
	const resumeDetail = $derived(
		resume ? resume.courseTitle : 'Start your first module in the curriculum.'
	);
</script>

<svelte:head>
	<title>Library | ShivWorks Network</title>
</svelte:head>

<main class="lib">
	<div class="container">
		<div class="section-heading" style="margin-bottom:1.8rem;">
			<p class="eyebrow">Curriculum & programs</p>
			<h1>The complete ShivWorks roadmap, visible from day one.</h1>
			<p>
				Everything the Network offers, grouped by how you train it — self-paced courses, live
				classes, private groups, and 1-on-1 coaching. Filter by tier or release status and open the
				modules you can access today.
			</p>
		</div>

		{#if resumeTitle}
			<a class="panel resume-panel" href={resumeHref}>
				<div>
					<p class="eyebrow">Resume training</p>
					<h2>{resumeTitle}</h2>
					<p>{resumeDetail}</p>
				</div>
				<span class="btn btn-secondary">
					{resume ? 'Open module' : 'Start training'}
					<ArrowRight size={16} />
				</span>
			</a>
		{/if}

		<LibraryCatalog courses={data.courses} member={data.user} />
	</div>
</main>
