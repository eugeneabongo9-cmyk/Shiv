<script lang="ts">
	import {
		ArrowRight,
		BellRing,
		CalendarClock,
		CheckCircle2,
		Clock3,
		RadioTower
	} from 'lucide-svelte';
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function getInitialRsvps() {
		return data.rsvps;
	}

	let rsvps = $state<Record<string, string>>(getInitialRsvps());
	let pendingId = $state<string | null>(null);
	let feedback = $state<string | null>(null);
	const isFree = $derived(data.user.tier === 'free');

	const sortedEvents = $derived.by(() =>
		[...data.events].sort((left, right) => {
			const statusWeight = (status: string) =>
				status === 'live' ? 0 : status === 'scheduled' ? 1 : 2;
			const statusDelta = statusWeight(left.status) - statusWeight(right.status);
			if (statusDelta !== 0) {
				return statusDelta;
			}

			const leftTime = left.startsAt ?? Number.MAX_SAFE_INTEGER;
			const rightTime = right.startsAt ?? Number.MAX_SAFE_INTEGER;

			if (left.status === 'ended' && right.status === 'ended') {
				return rightTime - leftTime;
			}

			return leftTime - rightTime;
		})
	);

	const spotlightEvent = $derived(sortedEvents[0] ?? null);
	const secondaryEvents = $derived(
		spotlightEvent ? sortedEvents.filter((event) => event.id !== spotlightEvent.id) : []
	);
	const liveCount = $derived(sortedEvents.filter((event) => event.status === 'live').length);
	const scheduledCount = $derived(
		sortedEvents.filter((event) => event.status === 'scheduled').length
	);
	const endedCount = $derived(sortedEvents.filter((event) => event.status === 'ended').length);
	const reminderCount = $derived(
		Object.values(rsvps).filter((status) => status === 'going').length
	);
	const identityStats = $derived.by(() => [
		{ label: 'Visible queue', value: String(sortedEvents.length) },
		{ label: 'Live now', value: String(liveCount) },
		{ label: 'Reminders', value: String(reminderCount) }
	]);

	function formatEventDate(value: number | null): string {
		return value ? new Date(value).toLocaleString() : 'Date coming soon';
	}

	function getEventStatusLabel(status: 'scheduled' | 'live' | 'ended'): string {
		switch (status) {
			case 'live':
				return 'Live now';
			case 'ended':
				return 'Ended';
			default:
				return 'Scheduled';
		}
	}

	function canRsvpEvent(status: 'scheduled' | 'live' | 'ended'): boolean {
		return status !== 'ended';
	}

	function getRsvpLabel(eventId: string): string {
		if (pendingId === eventId) {
			return 'Saving…';
		}

		return rsvps[eventId] === 'going' ? 'Reminder set' : 'RSVP / remind me';
	}

	function getDetailLabel(event: PageData['events'][number]): string {
		return event.eventKind === 'vip_call' ? 'Open booking' : 'Open event details';
	}

	async function rsvp(eventId: string) {
		pendingId = eventId;
		feedback = null;
		try {
			const response = await fetch(`/api/events/${eventId}/rsvp`, { method: 'POST' });
			const result = await response.json();
			if (!response.ok || !result.success) {
				feedback = result.error || 'Unable to save RSVP.';
				return;
			}
			rsvps = { ...rsvps, [eventId]: 'going' };
			feedback = 'You are on the reminder list.';
		} catch (error) {
			console.error('RSVP error', error);
			feedback = 'Unable to save RSVP.';
		} finally {
			pendingId = null;
		}
	}
</script>

<svelte:head>
	<title>Live | ShivWorks Network</title>
</svelte:head>

<main class="live">
	<div class="container">
		<div class="live-head">
			<div>
				<p class="eyebrow">Broadcasts</p>
				<h1>Live</h1>
				<p class="lede" style="margin-top:0.5rem;max-width:60ch;color:var(--color-fg-muted);">
					{#if isFree}
						Preview mode shows only the sessions marked for public access. Upgrade when you want the
						full member calendar and private-event routing.
					{:else}
						The live page centers the next active session, your reminder state, and the rest of the
						event queue.
					{/if}
				</p>
			</div>
			{#if liveCount > 0}
				<span class="live-now-pill"><span class="live-dot"></span> On air now</span>
			{/if}
		</div>

		{#if feedback}
			<div class="status-message">{feedback}</div>
		{/if}

		{#if isFree}
			<div class="status-message upgrade-banner">
				<strong>Preview live access.</strong>
				<span>
					Only preview touchpoints are visible here. Paid membership unlocks the broader livestream
					schedule.
				</span>
				<a class="ghost-link" href="/checkout">Upgrade access</a>
			</div>
		{/if}

		{#if sortedEvents.length === 0}
			<article class="panel">
				<p class="eyebrow">No events scheduled</p>
				<h2>The live lane is quiet for now.</h2>
				<p>
					When ShivWorks schedules a session for your access lane, it will appear here with RSVP and
					reminder support.
				</p>
				<div class="live-actions" style="margin-top:1rem;">
					<a class="btn btn-secondary" href="/library">Browse the library</a>
					<a class="ghost-link" href="/community">Open community</a>
					<a class="ghost-link" href="/dashboard">Back to dashboard</a>
				</div>
			</article>
		{:else if spotlightEvent}
			<section class="live-stage">
				<div class="live-player">
					{#if spotlightEvent.status === 'live' && spotlightEvent.embedUrl}
						<div class="media-ph">
							<div class="live-badge-overlay">
								<span class="live-tag"><span class="live-dot"></span> Live</span>
							</div>
							<div class="embed-shell">
								<iframe title={spotlightEvent.title} src={spotlightEvent.embedUrl} loading="lazy"
								></iframe>
							</div>
						</div>
					{:else}
						<div class="media-ph">
							<div class="media-ph-inner">
								<div class="play-badge"><RadioTower size={22} /></div>
								<span class="media-ph-label">[ {spotlightEvent.title} ]</span>
							</div>
						</div>
					{/if}

					<div class="live-info">
						<h2>{spotlightEvent.title}</h2>
						<p class="desc">{spotlightEvent.description}</p>
						<div class="meta" style="margin:0.85rem 0;">
							<span class="tag muted">{formatEventDate(spotlightEvent.startsAt)}</span>
							<span class="tag">{getAudienceLabel(spotlightEvent.accessTier)}</span>
							<span class="tag accent">{getEventStatusLabel(spotlightEvent.status)}</span>
						</div>
						<div class="live-actions">
							{#if canRsvpEvent(spotlightEvent.status)}
								<button
									class="btn btn-secondary"
									disabled={pendingId === spotlightEvent.id}
									onclick={() => rsvp(spotlightEvent.id)}
								>
									<BellRing size={16} />
									{getRsvpLabel(spotlightEvent.id)}
								</button>
							{/if}
							{#if spotlightEvent.bookingUrl}
								<a
									class="ghost-link"
									href={spotlightEvent.bookingUrl}
									target="_blank"
									rel="noreferrer"
								>
									{getDetailLabel(spotlightEvent)}
								</a>
							{/if}
						</div>
					</div>
				</div>
			</section>

			<section style="margin-top:2.6rem;">
				<div class="row-header">
					<h2>Upcoming sessions</h2>
					<span class="ghost-link">{reminderCount} reminders set</span>
				</div>
				<div class="sched-list">
					{#if secondaryEvents.length === 0}
						<article class="panel">
							<p>No additional events are queued.</p>
						</article>
					{:else}
						{#each secondaryEvents as event}
							<article class="panel sched-item">
								<div>
									<p class="eyebrow">{getEventStatusLabel(event.status)}</p>
									<strong>{event.title}</strong>
									<p>{event.description}</p>
									<span class="tag muted">{formatEventDate(event.startsAt)}</span>
								</div>
								<div class="live-actions">
									{#if canRsvpEvent(event.status)}
										<button
											class="btn btn-secondary"
											disabled={pendingId === event.id}
											onclick={() => rsvp(event.id)}
										>
											<BellRing size={16} />
											{getRsvpLabel(event.id)}
										</button>
									{/if}
									{#if event.bookingUrl}
										<a class="ghost-link" href={event.bookingUrl} target="_blank" rel="noreferrer">
											{getDetailLabel(event)}
											<ArrowRight size={16} />
										</a>
									{/if}
								</div>
							</article>
						{/each}
					{/if}
				</div>
			</section>

			<section style="margin-top:2rem;">
				<MemberIdentityPanel user={data.user} surface="live" stats={identityStats} compact />
			</section>
		{/if}
	</div>
</main>
