<script lang="ts">
	import { ArrowRight, Film, Search, Target, Video } from 'lucide-svelte';
	import LibraryCourseCard from '$lib/components/library/LibraryCourseCard.svelte';
	import {
		buildCatalogSummaryCounts,
		filterCatalogCourses,
		getCatalogEmptyBody,
		getCatalogEmptyTitle,
		getCatalogFilterStatusCopy,
		isCourseAccessible,
		LIBRARY_FILTER_LABELS,
		memberCanUpgrade,
		type LibraryCatalogFilter
	} from '$lib/library/catalog';
	import { sortCoursesForDisplay } from '$lib/utils/course-order';
	import type { CourseRecord } from '$lib/server/db/shivworks';
	import type { MemberRecord } from '$lib/server/db/shivworks';

	interface Props {
		courses: CourseRecord[];
		member: MemberRecord;
	}

	let { courses, member }: Props = $props();

	const catalogFilters: LibraryCatalogFilter[] = [
		'all',
		'available',
		'coming_soon',
		'free',
		'bronze',
		'vip'
	];

	let searchQuery = $state('');
	let activeFilter = $state<LibraryCatalogFilter>('all');
	let activeLane = $state<'training' | 'roadshow' | 'spotlights'>('training');

	const sortedCourses = $derived(sortCoursesForDisplay(courses));
	const laneOptions = $derived([
		{
			id: 'training' as const,
			title: 'Training',
			body: 'The current course library and curriculum roadmap.',
			count: sortedCourses.filter((course) => course.courseKind !== 'series').length,
			icon: Target
		},
		{
			id: 'roadshow' as const,
			title: 'The Roadshow',
			body: 'Road episodes and training-room video releases.',
			count: sortedCourses.filter((course) => course.id === 'series_roadshow').length,
			icon: Video
		},
		{
			id: 'spotlights' as const,
			title: 'ShivWorks Spotlights',
			body: 'Focused stories, lessons, and member video drops.',
			count: sortedCourses.filter((course) => course.id === 'series_spotlights').length,
			icon: Film
		}
	]);
	const laneCourses = $derived.by(() => {
		if (activeLane === 'roadshow') {
			return sortedCourses.filter((course) => course.id === 'series_roadshow');
		}
		if (activeLane === 'spotlights') {
			return sortedCourses.filter((course) => course.id === 'series_spotlights');
		}
		return sortedCourses.filter((course) => course.courseKind !== 'series');
	});
	const filteredCourses = $derived(
		filterCatalogCourses(laneCourses, { query: searchQuery, filter: activeFilter })
	);
	const accessibleCourses = $derived(
		laneCourses.filter((course) => isCourseAccessible(member, course))
	);
	const summaryCounts = $derived(buildCatalogSummaryCounts(filteredCourses, member));
	const showUpgradeBanner = $derived(memberCanUpgrade(member));
	const filterStatusCopy = $derived(getCatalogFilterStatusCopy(activeFilter));
	const emptyTitle = $derived(
		getCatalogEmptyTitle({
			hasCourses: laneCourses.length > 0,
			hasAccessibleCourses: accessibleCourses.length > 0,
			hasFilteredResults: filteredCourses.length > 0,
			filter: activeFilter,
			query: searchQuery,
			lane: activeLane
		})
	);
	const emptyBody = $derived(
		getCatalogEmptyBody({
			hasCourses: laneCourses.length > 0,
			hasAccessibleCourses: accessibleCourses.length > 0,
			hasFilteredResults: filteredCourses.length > 0,
			filter: activeFilter,
			query: searchQuery,
			memberTier: member.tier,
			lane: activeLane
		})
	);
</script>

{#if showUpgradeBanner}
	<div class="status-message upgrade-banner" style="margin-bottom:1.25rem;">
		<strong>Preview library access.</strong>
		<span>
			Every curriculum block stays visible here. Bronze or VIP unlocks paid tiers and open watchable
			modules.
		</span>
		<a class="ghost-link" href="/checkout">Upgrade access</a>
	</div>
{/if}

<div class="library-lanes" aria-label="Library sections">
	{#each laneOptions as lane}
		{@const Icon = lane.icon}
		<button
			type="button"
			class="library-lane"
			class:active={activeLane === lane.id}
			aria-pressed={activeLane === lane.id}
			onclick={() => {
				activeLane = lane.id;
				activeFilter = 'all';
				searchQuery = '';
			}}
		>
			<span class="library-lane-icon"><Icon size={18} /></span>
			<span>
				<strong>{lane.title}</strong>
				<small>{lane.body}</small>
			</span>
			<em>{lane.count}</em>
		</button>
	{/each}
</div>

<div class="lib-toolbar">
	<label
		class="threads-search library-search"
		for="library-catalog-search"
		style="flex:1;min-width:min(100%,16rem);"
	>
		<Search size={18} aria-hidden="true" />
		<input
			id="library-catalog-search"
			type="search"
			placeholder={activeLane === 'training' ? 'Search courses' : 'Search series'}
			autocomplete="off"
			bind:value={searchQuery}
		/>
	</label>

	<div class="filter-group" aria-label="Library filters">
		{#each catalogFilters as filter}
			<button
				type="button"
				class="filter-chip"
				class:active={activeFilter === filter}
				aria-pressed={activeFilter === filter}
				onclick={() => (activeFilter = filter)}
			>
				{LIBRARY_FILTER_LABELS[filter]}
			</button>
		{/each}
	</div>

	{#if member.role === 'admin'}
		<a class="ghost-link lib-admin-cta" href="/admin">
			Manage in admin console
			<ArrowRight size={14} aria-hidden="true" />
		</a>
	{/if}
</div>

<p class="lib-status-copy" style="color:var(--color-fg-muted);font-size:0.88rem;margin:0 0 1rem;">
	{filterStatusCopy}
	{#if laneCourses.length > 0}
		· {summaryCounts.showing} showing · {summaryCounts.availableNow} available now
		{#if summaryCounts.membershipRequired > 0}
			· {summaryCounts.membershipRequired} membership required
		{/if}
	{/if}
</p>

<div class="course-grid">
	{#if filteredCourses.length === 0}
		<article class="panel library-empty-panel" style="grid-column:1/-1;">
			<p class="eyebrow">
				{activeLane === 'training'
					? 'Training lane'
					: activeLane === 'roadshow'
						? 'Roadshow lane'
						: 'Spotlights lane'}
			</p>
			<h2 style="margin:0.35rem 0 0.65rem;font-size:1.35rem;">{emptyTitle}</h2>
			{#if emptyBody}
				<p>{emptyBody}</p>
			{/if}
			{#if showUpgradeBanner && !accessibleCourses.length}
				<a class="btn btn-secondary" href="/checkout">View member access</a>
			{:else if searchQuery.trim() || activeFilter !== 'all'}
				<button
					type="button"
					class="ghost-link"
					onclick={() => {
						searchQuery = '';
						activeFilter = 'all';
					}}
				>
					Clear search and filters
				</button>
			{:else if activeLane !== 'training'}
				<button type="button" class="ghost-link" onclick={() => (activeLane = 'training')}>
					Browse training courses
				</button>
			{/if}
		</article>
	{:else}
		{#each filteredCourses as course (course.id)}
			<LibraryCourseCard {course} {member} />
		{/each}
	{/if}
</div>

<style>
	.library-lanes {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.85rem;
		margin-bottom: 1.2rem;
	}

	.library-lane {
		min-height: 7.25rem;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 0.85rem;
		align-items: start;
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.13);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.035);
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.library-lane:hover,
	.library-lane.active {
		border-color: rgba(185, 28, 28, 0.58);
		background: rgba(185, 28, 28, 0.12);
	}

	.library-lane-icon {
		width: 2.35rem;
		height: 2.35rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		border: 1px solid rgba(185, 28, 28, 0.42);
		background: rgba(185, 28, 28, 0.14);
		color: var(--color-accent);
	}

	.library-lane strong,
	.library-lane small {
		display: block;
	}

	.library-lane strong {
		margin-bottom: 0.35rem;
		font-size: 0.98rem;
	}

	.library-lane small {
		color: var(--color-fg-muted);
		line-height: 1.45;
	}

	.library-lane em {
		font-style: normal;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.threads-search.library-search {
		height: calc(2rem + 0.6rem + 2px);
		box-sizing: border-box;
		margin-top: 0;
		background: #131313;
		border-color: #252525;
	}

	.threads-search.library-search #library-catalog-search {
		height: 2rem;
		min-height: 0;
		border: 1px solid rgba(188, 19, 19, 0.16);
		border-radius: 4px;
		background: rgba(8, 8, 8, 0.92);
		padding: 0 0.9rem;
		box-shadow: none;
	}

	@media (max-width: 860px) {
		.library-lanes {
			grid-template-columns: 1fr;
		}

		.library-lane {
			min-height: 0;
			padding: 0.9rem;
		}

		.library-lane small {
			display: none;
		}

		.lib-toolbar {
			flex-direction: column;
			align-items: stretch;
			gap: 0.85rem;
		}

		.filter-group {
			width: 100%;
			display: flex;
			flex-wrap: nowrap;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			gap: 0.45rem;
			padding-bottom: 0.15rem;
		}

		.filter-chip {
			flex: 0 0 auto;
			min-height: 2.5rem;
		}

		.library-empty-panel h2 {
			font-size: 1.15rem;
		}
	}
</style>
