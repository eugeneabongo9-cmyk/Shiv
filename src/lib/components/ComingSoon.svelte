<!--
  ComingSoon — used by placeholder routes (/community, /messages, /leaderboard)
  to render a polished "feature is on the way" panel that keeps the nav feeling
  complete without faking functionality.

  Per-route copy and layout live in src/lib/server/launch-gating.ts (GATED_ROUTES).
-->
<script lang="ts">
	import {
		ArrowRight,
		Bell,
		MessageSquareText,
		MessagesSquare,
		RadioTower,
		Settings,
		Sparkle,
		Sparkles,
		Trophy,
		UserRound,
		Users
	} from 'lucide-svelte';
	import UpcomingLessonsPanel from '$lib/components/UpcomingLessonsPanel.svelte';
	import type {
		ComingSoonIcon,
		ComingSoonTrackerMode,
		GatedRouteFallback
	} from '$lib/gated-route-meta';
	import type { UpcomingTracker } from '$lib/upcoming/types';

	interface Props {
		title: string;
		eyebrow?: string;
		subtitle?: string;
		body?: string;
		icon?: ComingSoonIcon;
		surface?: string;
		highlights?: string[];
		trackerMode?: ComingSoonTrackerMode;
		trackerHeading?: string;
		fallback?: GatedRouteFallback | null;
		tracker?: UpcomingTracker | null;
		foundingAccessHref?: string | null;
		showFoundingAccessCta?: boolean;
	}

	let {
		title,
		eyebrow = 'Coming soon',
		subtitle = '',
		body = '',
		icon = 'sparkles',
		surface = '',
		highlights = [],
		trackerMode = 'full',
		trackerHeading = 'Upcoming lessons',
		fallback = null,
		tracker = null,
		foundingAccessHref = null,
		showFoundingAccessCta = false
	}: Props = $props();

	function resolveIcon(value: ComingSoonIcon) {
		switch (value) {
			case 'community':
				return MessageSquareText;
			case 'messages':
				return MessagesSquare;
			case 'live':
				return RadioTower;
			case 'updates':
				return Bell;
			case 'leaderboard':
				return Trophy;
			case 'partners':
				return Users;
			case 'vip':
				return Sparkle;
			case 'profile':
				return UserRound;
			case 'settings':
				return Settings;
			default:
				return Sparkles;
		}
	}

	const Icon = $derived(resolveIcon(icon));
	const dropItems = $derived(tracker?.upcoming.slice(0, 4) ?? []);

	function formatCompactDate(targetAt: number): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(targetAt));
	}
</script>

<section
	class="section-block coming-soon-page"
	class:coming-soon-page--updates={surface === 'updates'}
	class:coming-soon-page--community={surface === 'community'}
>
	<div class="container coming-soon-shell">
		<article class="panel coming-soon-panel">
			<div class="coming-soon-hero">
				<div class="coming-soon-icon" aria-hidden="true">
					<Icon size={22} />
				</div>
				<p class="eyebrow">{eyebrow}</p>
				<h1>{title}</h1>
				{#if subtitle}
					<p class="coming-soon-status">{subtitle}</p>
				{/if}
				{#if body}
					<p class="coming-soon-body">{body}</p>
				{/if}
			</div>

			{#if highlights.length > 0}
				<ul class="coming-soon-highlights">
					{#each highlights as item}
						<li>{item}</li>
					{/each}
				</ul>
			{/if}

			{#if tracker && trackerMode === 'compact'}
				<div class="coming-soon-compact-track">
					<span class="coming-soon-compact-label">Estimated open</span>
					{#if tracker.countdown.targetAt}
						<strong>{formatCompactDate(tracker.countdown.targetAt)}</strong>
						<p>{tracker.countdown.label}</p>
					{:else}
						<strong>Date coming soon</strong>
						<p>{tracker.countdown.detail}</p>
					{/if}
				</div>
			{:else if tracker && trackerMode === 'drops' && dropItems.length > 0}
				<div class="coming-soon-drops">
					<p class="coming-soon-drops-label">{trackerHeading}</p>
					<ul class="coming-soon-drop-list">
						{#each dropItems as item}
							<li class="coming-soon-drop-row">
								<div class="coming-soon-drop-copy">
									<strong>{item.title}</strong>
									<p>{item.detail}</p>
								</div>
								<span class="coming-soon-drop-date">{item.releaseLabel}</span>
							</li>
						{/each}
					</ul>
				</div>
			{:else if tracker && trackerMode === 'full'}
				<div class="coming-soon-tracker">
					<UpcomingLessonsPanel {tracker} heading={trackerHeading} />
				</div>
			{/if}

			{#if showFoundingAccessCta && foundingAccessHref}
				<div class="coming-soon-founding-cta">
					<a class="btn-primary coming-soon-founding-btn" href={foundingAccessHref}>
						<span class="coming-soon-founding-btn-text">
							<span>Get access once live</span>
							<span class="coming-soon-founding-btn-sub">by becoming a founding member</span>
						</span>
					</a>
				</div>
			{/if}

			{#if fallback}
				<div class="coming-soon-fallback">
					<a
						class="btn-secondary coming-soon-fallback-btn"
						href={fallback.href}
						target={fallback.external ? '_blank' : undefined}
						rel={fallback.external ? 'noopener noreferrer' : undefined}
					>
						{fallback.label}
						<ArrowRight size={16} />
					</a>
				</div>
			{/if}
		</article>
	</div>
</section>
