<script lang="ts">
	import { Lock } from 'lucide-svelte';
	import CourseCard from '$lib/components/CourseCard.svelte';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import {
		getCourseLockCopy,
		getCourseProgressDetail,
		getCourseProgressBadge,
		isCourseAccessible,
		PROGRESS_BADGE_LABELS,
		shouldShowUpgradeCta
	} from '$lib/library/catalog';
	import type { CourseRecord } from '$lib/server/db/shivworks';
	import type { MemberRecord } from '$lib/server/db/shivworks';

	interface Props {
		course: CourseRecord;
		member: MemberRecord;
	}

	let { course, member }: Props = $props();

	const accessible = $derived(isCourseAccessible(member, course));
	const locked = $derived(!accessible);
	const progressBadge = $derived(getCourseProgressBadge(course));
	const progressDetail = $derived(getCourseProgressDetail(course));
	const href = $derived(accessible ? `/library/${course.slug}` : undefined);
	const showUpgrade = $derived(shouldShowUpgradeCta(member, course.accessTier));
	const lockCopy = $derived(getCourseLockCopy(course.accessTier));
	const tierLabel = $derived(getAudienceLabel(course.accessTier));
</script>

<article class:locked class="library-catalog-card">
	<div class="library-catalog-card-shell">
		<CourseCard
			{course}
			{href}
			{locked}
			progressBadge={locked ? undefined : PROGRESS_BADGE_LABELS[progressBadge]}
			progressDetail={locked ? undefined : progressDetail}
		/>

		{#if locked}
			<div class="library-catalog-lock-overlay" aria-label="Membership required for this course">
				<div class="library-catalog-lock-panel">
					<span class="library-catalog-lock-badge">
						<Lock size={18} aria-hidden="true" />
						Founding member
					</span>
					<strong class="library-catalog-lock-tier">{tierLabel}</strong>
					<p class="library-catalog-lock-copy">{lockCopy}</p>
					<p class="library-catalog-lock-title">{course.title}</p>
					{#if showUpgrade}
						<a class="btn-primary library-catalog-lock-cta" href="/checkout"
							>Become a founding member</a
						>
					{:else}
						<span class="library-catalog-lock-hint"
							>Included with your membership once it opens.</span
						>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</article>

<style>
	.library-catalog-card {
		display: flex;
		flex-direction: column;
		min-height: 100%;
	}

	.library-catalog-card-shell {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 100%;
		border-radius: 1.5rem;
	}

	.library-catalog-card.locked .library-catalog-card-shell {
		border: 1px dashed rgba(209, 178, 122, 0.42);
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
	}

	.library-catalog-card.locked :global(.course-card) {
		filter: grayscale(0.45) brightness(0.78);
		opacity: 1;
		pointer-events: none;
		user-select: none;
	}

	.library-catalog-card.locked :global(.course-card:hover) {
		transform: none;
		box-shadow: none;
	}

	.library-catalog-card.locked :global(.course-card.available) {
		border-color: rgba(255, 255, 255, 0.12);
		box-shadow: none;
	}

	.library-catalog-lock-overlay {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		border-radius: 1.5rem;
		background:
			linear-gradient(
				180deg,
				rgba(8, 8, 8, 0.28) 0%,
				rgba(8, 8, 8, 0.58) 42%,
				rgba(8, 8, 8, 0.72) 100%
			),
			repeating-linear-gradient(-45deg, rgba(209, 178, 122, 0.03) 0 2px, transparent 2px 10px);
		backdrop-filter: blur(1px);
	}

	.library-catalog-lock-panel {
		width: min(100%, 18rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.55rem;
		padding: 1.1rem 1rem 1.15rem;
		border-radius: 1.15rem;
		border: 1px solid rgba(209, 178, 122, 0.34);
		background: rgba(12, 12, 12, 0.78);
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
	}

	.library-catalog-lock-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.38rem 0.72rem;
		border-radius: 999px;
		background: rgba(188, 19, 19, 0.18);
		border: 1px solid rgba(188, 19, 19, 0.42);
		color: #f4c8c8;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.library-catalog-lock-badge :global(svg) {
		color: var(--color-accent);
	}

	.library-catalog-lock-tier {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.library-catalog-lock-copy {
		margin: 0;
		color: #f4ede1;
		font-size: 0.95rem;
		line-height: 1.55;
	}

	.library-catalog-lock-title {
		margin: 0.15rem 0 0;
		color: var(--color-fg-secondary);
		font-size: 0.82rem;
		line-height: 1.45;
	}

	.library-catalog-lock-cta {
		margin-top: 0.35rem;
		width: 100%;
		justify-content: center;
	}

	.library-catalog-lock-hint {
		margin-top: 0.2rem;
		color: var(--color-fg-secondary);
		font-size: 0.82rem;
		line-height: 1.45;
	}
</style>
