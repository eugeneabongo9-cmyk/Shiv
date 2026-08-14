<script lang="ts">
	import {
		ArrowRight,
		ArrowUpRight,
		CalendarClock,
		Film,
		MessageSquareText,
		RadioTower,
		Shield
	} from 'lucide-svelte';
	import { SUPPORT_EMAIL } from '$lib/constants/site';
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const hasCircle = $derived(Boolean(data.circleUrl));
	const isVip = $derived(data.user.tier === 'vip');
	const availableCourseCount = $derived(data.courseCounts.available);
	const nextEvent = $derived.by(() => {
		const sorted = [...data.events].sort((left, right) => {
			const statusWeight = (status: string) =>
				status === 'live' ? 0 : status === 'scheduled' ? 1 : 2;
			const statusDelta = statusWeight(left.status) - statusWeight(right.status);
			if (statusDelta !== 0) {
				return statusDelta;
			}

			const leftTime = left.startsAt ?? Number.MAX_SAFE_INTEGER;
			const rightTime = right.startsAt ?? Number.MAX_SAFE_INTEGER;
			return leftTime - rightTime;
		});

		return sorted[0] ?? null;
	});
	const leadUpdate = $derived(data.updates[0] ?? null);

	function formatEventDate(value: number | null): string {
		return value ? new Date(value).toLocaleString() : 'Timing posting soon';
	}
</script>

<svelte:head>
	<title>Community | ShivWorks Network</title>
</svelte:head>

<div class="comm-shell">
	<aside class="channels col-rule" aria-label="Community channels">
		<p class="channels-title">Community</p>
		<p class="chan-cat">General</p>
		<span class="chan"><span class="hash">#</span> welcome</span>
		<span class="chan"><span class="hash">#</span> introductions</span>
		<p class="chan-cat">Training</p>
		<span class="chan active"><span class="hash">#</span> ecqc</span>
		<span class="chan"><span class="hash">#</span> muc</span>
	</aside>

	<main class="feed-wrap col-rule">
		<div class="feed-head">
			<h2><span class="hash">#</span> community</h2>
			<p>
				Member conversation stays inside the ShivWorks network shell — after-action reports,
				training questions, and member briefings tied to the curriculum and live calendar.
			</p>
		</div>

		<div class="feed">
			<article class="panel community-command-panel">
				<div class="community-command-header">
					<div class="inline-membership">
						{#if isVip}
							<span class="detail-pill">VIP distinction should carry through the community</span>
						{:else}
							<span class="detail-pill muted">Paid member discussion lane</span>
						{/if}
					</div>
					<h2>Use this lane for reports, questions, and ongoing member conversation.</h2>
					<p>
						The point is not open-ended chatter. The community should stay tied to training,
						live-session takeaways, and what members are actually testing in the field.
					</p>
				</div>

				<div class="community-signal-grid">
					<article class="community-signal-card">
						<span>Community state</span>
						<strong>{hasCircle ? 'Ready to launch' : 'Config pending'}</strong>
						<p>
							{hasCircle
								? 'Embedded plus direct-open fallback are available.'
								: 'Circle still needs an environment URL before embed launch is live.'}
						</p>
					</article>
					<article class="community-signal-card">
						<span>Courses ready now</span>
						<strong>{availableCourseCount}</strong>
						<p>
							Use the library as the source material for questions, drills, and after-action
							discussion.
						</p>
					</article>
					<article class="community-signal-card">
						<span>Next touchpoint</span>
						<strong>{nextEvent ? nextEvent.title : 'No session posted yet'}</strong>
						<p>
							{nextEvent
								? formatEventDate(nextEvent.startsAt)
								: 'The live lane will feed the next discussion cycle when the next member session is scheduled.'}
						</p>
					</article>
				</div>

				<div class="community-intent-grid">
					<article class="community-intent-card">
						<MessageSquareText size={18} />
						<strong>After-action reports</strong>
						<p>Post what you ran, what held up, and where the methodology changed the outcome.</p>
					</article>
					<article class="community-intent-card">
						<Film size={18} />
						<strong>Curriculum questions</strong>
						<p>
							Keep discussion attached to the course lane so members can move from video to
							discussion without losing context.
						</p>
					</article>
					<article class="community-intent-card">
						<Shield size={18} />
						<strong>Operational tone</strong>
						<p>
							Keep this direct, useful, and specific. Members are here for signal, not for a public
							social feed.
						</p>
					</article>
				</div>

				<div class="community-brief-footer">
					{#if leadUpdate}
						<div class="community-brief-note">
							<p class="card-eyebrow">Latest build brief</p>
							<strong>{leadUpdate.title}</strong>
							<p>{leadUpdate.bodyMarkdown}</p>
						</div>
					{/if}

					<div class="community-brief-actions">
						<a class="btn-secondary" href="/library">
							Open library
							<ArrowRight size={16} />
						</a>
						<a class="ghost-link" href="/live">Open live page</a>
						<a class="ghost-link" href="/dashboard">Back to dashboard</a>
					</div>
				</div>
			</article>

			<article class="panel">
				<div class="community-launch-head">
					<p class="eyebrow">{hasCircle ? 'Launch workflow' : 'Community setup pending'}</p>
					<h2>
						{#if hasCircle}
							Open the discussion layer without leaving the ShivWorks shell.
						{:else}
							The community lane is staged, but Circle is not configured for this environment yet.
						{/if}
					</h2>
					<p>
						{#if hasCircle}
							If the embed feels cramped or your browser blocks part of the experience, open Circle
							directly in a new tab and continue from there.
						{:else}
							The member-facing command lane is ready. Once the Circle URL is added, the embedded
							community will appear here automatically.
						{/if}
					</p>
				</div>

				<div class="community-launch-actions">
					{#if hasCircle}
						<a class="btn btn-primary" href={data.circleUrl} target="_blank" rel="noreferrer">
							Open community
							<ArrowUpRight size={16} />
						</a>
					{/if}
					<a class="btn btn-secondary" href="/library">
						Open library
						<ArrowRight size={16} />
					</a>
					<a class="ghost-link" href="/live">
						<RadioTower size={16} />
						Check live touchpoints
					</a>
				</div>

				<div class="community-launch-notes">
					<div class="community-launch-note">
						<CalendarClock size={16} />
						<div>
							<strong>Next member touchpoint</strong>
							<p>
								{nextEvent
									? `${nextEvent.title} · ${formatEventDate(nextEvent.startsAt)}`
									: 'No upcoming member session is posted yet.'}
							</p>
						</div>
					</div>
					<div class="community-launch-note">
						<Film size={16} />
						<div>
							<strong>Current training surface</strong>
							<p>
								{availableCourseCount > 0
									? `${availableCourseCount} course${availableCourseCount === 1 ? '' : 's'} are live for this access lane.`
									: 'The curriculum roadmap is visible, but playable modules have not landed yet.'}
							</p>
						</div>
					</div>
				</div>
			</article>

			{#if hasCircle}
				<article class="panel community-embed-panel">
					<div class="community-embed-head">
						<div>
							<p class="eyebrow">Embedded community</p>
							<h3>Inside the network</h3>
						</div>
						<a class="ghost-link" href={data.circleUrl} target="_blank" rel="noreferrer">
							Open direct
							<ArrowUpRight size={16} />
						</a>
					</div>

					<div class="community-frame-shell">
						<iframe title="ShivWorks Circle community" src={data.circleUrl} loading="lazy"></iframe>
					</div>
				</article>
			{:else}
				<article class="panel">
					<p class="eyebrow">Configuration</p>
					<h3>Circle URL still needs to be added for this environment.</h3>
					<p>
						Add <code>PUBLIC_CIRCLE_COMMUNITY_URL</code> to enable the embedded community frame and the
						direct-open launch path here.
					</p>
					<p class="config-help">
						If members need access before Circle is connected here, contact
						<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
					</p>
				</article>
			{/if}
		</div>
	</main>

	<aside class="members">
		<h4>Your lane</h4>
		<MemberIdentityPanel
			user={data.user}
			surface="community"
			updatesCount={data.updates.length}
			{availableCourseCount}
			eventsCount={data.events.length}
			compact
		/>
	</aside>
</div>
