<script lang="ts">
	import {
		ArrowRight,
		Check,
		Flame,
		MessageSquare,
		Radio,
		Settings,
		Target,
		User
	} from 'lucide-svelte';
	import CourseCard from '$lib/components/CourseCard.svelte';
	import CourseThumbnail from '$lib/components/CourseThumbnail.svelte';
	import { LANDING_CURRICULUM_PLACEHOLDER_SRC } from '$lib/constants/landing';
	import { MEMBERSHIP_TIERS } from '$lib/constants/tiers';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const firstName = $derived(data.user.name.trim().split(/\s+/)[0] ?? data.user.name);
	const gamification = $derived(data.activity.gamification);
	const resume = $derived(data.activity.resume);
	const rankLabel = $derived(gamification.rank ?? 'Member');
	const tierBadge = $derived(data.user.tier ? MEMBERSHIP_TIERS[data.user.tier].badge : 'Member');
	const isVip = $derived(data.user.tier === 'vip' || data.user.role === 'admin');
	const completedCourses = $derived(
		data.courses.filter(
			(c) =>
				c.completedModuleCount > 0 &&
				c.availableModuleCount > 0 &&
				c.completedModuleCount >= c.availableModuleCount
		).length
	);
	const firstCourse = $derived(data.courses[0] ?? null);
	const resumeHref = $derived(
		resume?.href ?? (firstCourse ? `/library/${firstCourse.slug}` : '/library')
	);
	const resumeTitle = $derived(resume?.displayTitle ?? firstCourse?.title ?? 'Open the library');
	const resumeDetail = $derived(
		resume
			? resume.courseTitle
			: firstCourse
				? 'Start your first module in the curriculum.'
				: 'Browse the full roadmap.'
	);
	const resumeProgress = $derived(resume?.progressLabel ?? 'Ready to begin');
	const rankProgressPct = $derived(
		gamification.trainingPoints > 0
			? Math.min(100, Math.round((gamification.trainingPoints % 1000) / 10))
			: 0
	);
	const whatsNewItems = $derived.by(() => {
		if (data.updates.length > 0) {
			return data.updates.slice(0, 3).map((update, index) => ({
				tag: index === 0 ? 'New episode' : index === 1 ? 'Course live' : 'Livestream',
				tagClass: index === 0 ? 'tag accent' : index === 1 ? 'tag brass' : 'tag',
				title: update.title,
				body: update.bodyMarkdown.slice(0, 160),
				meta: new Date(update.publishedAt).toLocaleDateString(),
				showMedia: index === 0,
				href: '/library' as string | null
			}));
		}
		return [
			{
				tag: 'Platform',
				tagClass: 'tag accent',
				title: data.experience.countdown?.label ?? 'ShivWorks Network',
				body: data.experience.cohortSummary,
				meta: 'Launch updates',
				showMedia: true,
				href: '/library' as string | null
			},
			{
				tag: 'Curriculum',
				tagClass: 'tag brass',
				title: 'Curriculum roadmap',
				body: 'Every course block in the ECQC system is visible from day one in the library.',
				meta: 'Always available',
				showMedia: false,
				href: '/library' as string | null
			},
			{
				tag: 'Account',
				tagClass: 'tag',
				title: 'Training profile & settings',
				body: 'Confirm membership details, notification preferences, and active sessions.',
				meta: 'Available now',
				showMedia: false,
				href: '/account' as string | null
			}
		];
	});
</script>

<svelte:head>
	<title>Dashboard · ShivWorks Network</title>
</svelte:head>

<main class="dash">
	<div class="container">
		<div class="dash-header">
			<div>
				<p class="eyebrow">Welcome back</p>
				<h1>{firstName}.</h1>
			</div>
			<div class="profile-chips">
				<span class="tag accent">{rankLabel}</span>
				<span class="tag">{gamification.trainingPoints} TP</span>
				<span class="tag muted">{gamification.streakDays}-day streak</span>
			</div>
		</div>

		{#if data.user.tier === 'free'}
			<section class="dash-section">
				<div class="panel promo-card">
					<div class="promo-icon"><Target size={22} /></div>
					<div>
						<h3>Preview access is active</h3>
						<p>
							This account is in preview mode. Bronze or VIP activates the full curriculum and paid
							member lanes.
						</p>
						<a class="ghost-link" href="/checkout">View upgrade options <ArrowRight size={14} /></a>
					</div>
				</div>
			</section>
		{/if}

		{#if !data.profileComplete}
			<section class="dash-section">
				<div
					class="panel"
					style="padding:1.4rem 1.6rem;display:flex;flex-direction:column;gap:0.75rem;"
				>
					<strong>Complete your profile</strong>
					<p style="color:var(--color-fg-muted);line-height:1.55;">
						Add your location, background, and training goal so partner finder and member surfaces
						can use your dossier.
					</p>
					<a class="btn-secondary" href="/account">Complete your profile</a>
				</div>
			</section>
		{/if}

		<section class="dash-section">
			<a class="panel resume-card" href={resumeHref}>
				<div class="media-ph">
					{#if resume}
						<CourseThumbnail
							posterSrc={resume.artworkComingSoon ? undefined : resume.artworkSrc}
							placeholderSrc={LANDING_CURRICULUM_PLACEHOLDER_SRC}
							label={resumeTitle}
							comingSoon={resume.artworkComingSoon}
						/>
					{:else}
						<div class="media-ph-inner">
							<img
								src={LANDING_CURRICULUM_PLACEHOLDER_SRC}
								alt=""
								loading="lazy"
								decoding="async"
								style="width:100%;height:100%;object-fit:cover;opacity:0.55;"
							/>
						</div>
					{/if}
				</div>
				<div class="resume-body">
					<p class="eyebrow">Continue where you left off</p>
					<h2>{resumeTitle}</h2>
					<p class="resume-module">{resumeDetail}</p>
					{#if resume}
						<div class="progress-track" style="margin:0.6rem 0 0.2rem;">
							<div class="progress-fill" style="width:{resume.progressPercent}%"></div>
						</div>
					{/if}
					<p class="resume-pct">{resumeProgress}</p>
					<span class="ghost-link" style="margin-top:0.6rem;">
						{resume ? 'Resume training' : 'Open training'}
						<ArrowRight size={14} />
					</span>
				</div>
			</a>
		</section>

		<section class="dash-section">
			<div class="row-header">
				<h2>Training status</h2>
				<a class="ghost-link" href="/library">Library <ArrowRight size={14} /></a>
			</div>
			<div class="panel stat-tiles">
				<div class="stat-tile">
					<div class="stat-tile-icon"><Target size={18} /></div>
					<p class="stat-label">Rank</p>
					<p class="stat-value text">{rankLabel}</p>
				</div>
				<div class="stat-tile">
					<div class="stat-tile-icon"><Target size={18} /></div>
					<p class="stat-label">Training points</p>
					<p class="stat-value">{gamification.trainingPoints}</p>
				</div>
				<div class="stat-tile">
					<div class="stat-tile-icon"><Flame size={18} /></div>
					<p class="stat-label">Current streak</p>
					<p class="stat-value">
						{gamification.streakDays}
						<span style="font-size:0.9rem;color:var(--color-fg-muted);font-family:var(--font-mono)"
							>days</span
						>
					</p>
				</div>
				<div class="stat-tile">
					<div class="stat-tile-icon"><Check size={18} /></div>
					<p class="stat-label">Courses completed</p>
					<p class="stat-value">
						{completedCourses}
						<span style="font-size:0.9rem;color:var(--color-fg-muted);font-family:var(--font-mono)"
							>/ {data.courseCounts.visible}</span
						>
					</p>
				</div>
				<div class="rank-progress">
					<div class="rank-progress-row">
						<span>{rankLabel}</span>
						<span>{tierBadge} · {gamification.trainingPoints} TP</span>
					</div>
					<div class="progress-track">
						<div class="progress-fill" style="width:{rankProgressPct}%"></div>
					</div>
				</div>
			</div>
		</section>

		<section class="dash-section">
			<div class="row-header">
				<h2>What's new</h2>
				<a class="ghost-link" href="/library">Browse library <ArrowRight size={14} /></a>
			</div>
			<div class="whatsnew-grid">
				{#each whatsNewItems as item}
					{#if item.href}
						<a class="panel wn-card" href={item.href} style="text-decoration:none;color:inherit;">
							{#if item.showMedia}
								<div class="media-ph">
									<CourseThumbnail
										placeholderSrc={LANDING_CURRICULUM_PLACEHOLDER_SRC}
										label={item.title}
									/>
								</div>
							{/if}
							<div class="wn-body" style={item.showMedia ? '' : 'padding-top:1.3rem;'}>
								<span class={item.tagClass} style="align-self:flex-start;">{item.tag}</span>
								<h3>{item.title}</h3>
								<p>{item.body}</p>
								<span class="wn-meta">{item.meta}</span>
							</div>
						</a>
					{:else}
						<article class="panel wn-card">
							<div class="wn-body" style="padding-top:1.3rem;">
								<span class={item.tagClass} style="align-self:flex-start;">{item.tag}</span>
								<h3>{item.title}</h3>
								<p>{item.body}</p>
								<span class="wn-meta">{item.meta}</span>
							</div>
						</article>
					{/if}
				{/each}
			</div>
		</section>

		<section class="dash-section">
			<div class="row-header">
				<h2>Pick up the curriculum</h2>
				<a class="ghost-link" href="/library">Full library <ArrowRight size={14} /></a>
			</div>
			{#if data.courses.length === 0}
				<div class="panel" style="padding:1.6rem;color:var(--color-fg-muted);">
					<p style="margin:0 0 0.75rem;">No curriculum modules are promoted into watch-now yet.</p>
					<a class="ghost-link" href="/library"
						>Browse the library roadmap <ArrowRight size={14} /></a
					>
				</div>
			{:else}
				<div class="course-row">
					{#each data.courses as course, i (course.id)}
						<CourseCard {course} href={`/library/${course.slug}`} index={i} />
					{/each}
				</div>
			{/if}
		</section>

		<section class="dash-section">
			<div class="split-grid">
				<div class="panel promo-card">
					<div class="promo-icon"><User size={22} /></div>
					<div>
						<h3>Account &amp; profile</h3>
						<p>Confirm membership details and finish any missing training profile fields.</p>
						<a class="ghost-link" href="/account">Open account <ArrowRight size={14} /></a>
					</div>
				</div>
				<div class="panel promo-card">
					<div class="promo-icon"><Settings size={22} /></div>
					<div>
						<h3>Settings &amp; sessions</h3>
						<p>Manage notification preferences and revoke devices you no longer use.</p>
						<a class="ghost-link" href="/settings">Open settings <ArrowRight size={14} /></a>
					</div>
				</div>
				{#if isVip}
					<div class="panel promo-card">
						<div class="promo-icon"><Radio size={22} /></div>
						<div>
							<h3>VIP Lounge</h3>
							<p>Request quarterly calls and review confirmed booking details.</p>
							<a class="ghost-link" href="/vip-calls">Open VIP Lounge <ArrowRight size={14} /></a>
						</div>
					</div>
				{:else}
					<div class="panel promo-card">
						<div class="promo-icon"><MessageSquare size={22} /></div>
						<div>
							<h3>Need help with access?</h3>
							<p>
								If checkout completed but membership has not synced, use the welcome recovery path.
							</p>
							<a class="ghost-link" href="/welcome">Check access status <ArrowRight size={14} /></a>
						</div>
					</div>
				{/if}
			</div>
		</section>
	</div>
</main>
