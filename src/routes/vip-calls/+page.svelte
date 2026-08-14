<script lang="ts">
	import { CalendarClock, CheckCircle2, Clock3, MessageSquareText, Video } from 'lucide-svelte';
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function getInitialRequests() {
		return data.vipAccess ? data.requests : [];
	}

	let requests = $state(getInitialRequests());
	let goals = $state('');
	let preferredMonth = $state('');
	let notes = $state('');
	let submitting = $state(false);
	let feedback = $state<string | null>(null);
	const vipAccess = $derived(data.vipAccess);
	let hasOpenRequest = $derived(
		requests.some(
			(request) =>
				request.status === 'requested' ||
				request.status === 'approved' ||
				request.status === 'scheduled'
		)
	);
	const openRequest = $derived(
		requests.find(
			(request) =>
				request.status === 'requested' ||
				request.status === 'approved' ||
				request.status === 'scheduled'
		) ?? null
	);
	const completedRequestCount = $derived(
		requests.filter((request) => request.status === 'completed').length
	);
	const upcomingBooking = $derived(
		data.bookings.find((booking) => booking.startsAt >= Date.now()) ?? data.bookings[0] ?? null
	);
	const archivedBookings = $derived(
		upcomingBooking ? data.bookings.filter((booking) => booking.id !== upcomingBooking.id) : []
	);
	const identityStats = $derived.by(() => [
		{ label: 'Open requests', value: hasOpenRequest ? '1' : '0' },
		{ label: 'Confirmed', value: String(data.bookings.length) },
		{ label: 'Completed', value: String(completedRequestCount) }
	]);

	function formatDateTime(value: number): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(value));
	}

	function formatDate(value: number): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(value));
	}

	function formatTime(value: number): string {
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(value));
	}

	function getRequestStatusLabel(
		status: 'requested' | 'approved' | 'scheduled' | 'completed' | 'declined'
	): string {
		switch (status) {
			case 'approved':
				return 'Approved';
			case 'scheduled':
				return 'Scheduled';
			case 'completed':
				return 'Completed';
			case 'declined':
				return 'Declined';
			default:
				return 'Request received';
		}
	}

	function getRequestStatusCopy(
		status: 'requested' | 'approved' | 'scheduled' | 'completed' | 'declined'
	): string {
		switch (status) {
			case 'approved':
				return 'The ShivWorks team has reviewed the request and is lining up the final slot.';
			case 'scheduled':
				return 'The request has moved into a confirmed booking state. Watch the call queue for final details.';
			case 'completed':
				return 'This VIP call cycle has been completed and stays in your account history.';
			case 'declined':
				return 'This request did not move forward. You can submit a new one when the lane reopens.';
			default:
				return 'The request is on file and waiting for review inside the ShivWorks operating lane.';
		}
	}

	async function submitRequest(event: Event) {
		event.preventDefault();
		if (hasOpenRequest) {
			feedback = 'You already have an open VIP request in progress.';
			return;
		}
		submitting = true;
		feedback = null;

		try {
			const response = await fetch('/api/vip-calls/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ goals, preferredMonth, notes })
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				feedback = result.error || 'Unable to submit request.';
				return;
			}
			feedback = 'Your VIP call request has been submitted.';
			requests = [
				{
					id: crypto.randomUUID(),
					memberId: data.user.clerkUserId,
					goals,
					preferredMonth: preferredMonth || null,
					notes: notes || null,
					status: 'requested',
					createdAt: Date.now(),
					updatedAt: Date.now()
				},
				...requests
			];
			goals = '';
			preferredMonth = '';
			notes = '';
		} catch (error) {
			console.error('VIP request error', error);
			feedback = 'Unable to submit request.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>VIP Calls | ShivWorks Network</title>
</svelte:head>

<section class="dash-section">
	<div class="container vip-calls-layout">
		{#if !vipAccess}
			<article class="panel">
				<div class="vip-primary-header">
					<div>
						<p class="eyebrow">VIP Lounge</p>
						<h1>VIP access required.</h1>
					</div>
					<span class="detail-pill">Locked</span>
				</div>
				<p>
					Quarterly VIP calls and the Lounge workflow are included with VIP membership. Your current
					account stays on the Bronze training path until you upgrade.
				</p>
				<div
					class="welcome-actions"
					style="margin-top:1.25rem;display:flex;gap:0.75rem;flex-wrap:wrap;"
				>
					<a class="btn-primary" href="/checkout?redirect=%2Fvip-calls">View VIP upgrade</a>
					<a class="btn-secondary" href="/library">Back to library</a>
					<a class="ghost-link" href="/dashboard">Dashboard</a>
				</div>
			</article>
		{:else}
			<article class="panel">
				<div class="vip-primary-header">
					<div>
						<p class="eyebrow">VIP Priority Booking</p>
						<h1>Book your next VIP session.</h1>
					</div>
					<span class="detail-pill">VIP only</span>
				</div>
				<p>
					Priority Booking happens here inside the Network. Submit your preferred timing and goals,
					then track review, confirmed booking details, and Zoom access in one place.
				</p>
				<div class="welcome-actions">
					<a class="btn-primary" href="#priority-booking-request">
						{hasOpenRequest ? 'View booking request' : 'Start Priority Booking'}
					</a>
				</div>

				<div class="vip-summary-grid">
					<div class="vip-summary-card">
						<span>Open requests</span>
						<strong>{hasOpenRequest ? 1 : 0}</strong>
						<p>One active request at a time keeps the lane deliberate and reviewable.</p>
					</div>
					<div class="vip-summary-card">
						<span>Confirmed calls</span>
						<strong>{data.bookings.length}</strong>
						<p>Booked sessions and join details stay attached to your account history.</p>
					</div>
					<div class="vip-summary-card">
						<span>Completed cycles</span>
						<strong>{completedRequestCount}</strong>
						<p>Past request cycles remain visible so the premium workflow has continuity.</p>
					</div>
				</div>

				{#if feedback}
					<div class="status-message">{feedback}</div>
				{/if}

				<div class="vip-state-card">
					{#if upcomingBooking}
						<p class="eyebrow">Next confirmed call</p>
						<h2>{formatDate(upcomingBooking.startsAt)}</h2>
						<p>
							Call window {formatTime(upcomingBooking.startsAt)} to {formatTime(
								upcomingBooking.endsAt
							)}.
							{#if upcomingBooking.confirmationSentAt}
								Confirmation sent {formatDateTime(upcomingBooking.confirmationSentAt)}.
							{/if}
						</p>
						<div class="updates-meta-row">
							<span class="detail-pill">
								<CalendarClock size={14} />
								{formatDateTime(upcomingBooking.startsAt)}
							</span>
							<span class="detail-pill muted">
								<CheckCircle2 size={14} />
								Confirmed
							</span>
						</div>
						<div class="vip-state-actions">
							{#if upcomingBooking.zoomJoinUrl}
								<a
									class="btn-primary"
									href={upcomingBooking.zoomJoinUrl}
									target="_blank"
									rel="noreferrer"
								>
									<Video size={16} />
									Join Zoom
								</a>
							{/if}
							<a class="ghost-link" href="/dashboard">Return to dashboard</a>
						</div>
					{:else if openRequest}
						<p class="eyebrow">Request in progress</p>
						<h2>{getRequestStatusLabel(openRequest.status)}</h2>
						<p>{getRequestStatusCopy(openRequest.status)}</p>
						<div class="updates-meta-row">
							<span class="detail-pill">
								<MessageSquareText size={14} />
								Submitted {formatDateTime(openRequest.createdAt)}
							</span>
							{#if openRequest.preferredMonth}
								<span class="detail-pill muted">Preferred {openRequest.preferredMonth}</span>
							{/if}
						</div>
					{:else}
						<p class="eyebrow">VIP lane is open</p>
						<h2>No active request on file.</h2>
						<p>
							Use the request form below to open the next quarterly call cycle. Once it is in
							review, the page will shift into a tracked request state automatically.
						</p>
					{/if}
				</div>

				<div class="vip-form-block" id="priority-booking-request">
					<p class="eyebrow">VIP Priority Booking request</p>
					{#if hasOpenRequest}
						<div class="status-message">
							You already have an open VIP request. The ShivWorks team will update this page when
							the call moves to approval or a confirmed slot.
						</div>
					{/if}

					<form class="stack-form" onsubmit={submitRequest}>
						<label>
							<span>Your goals</span>
							<textarea bind:value={goals} rows="5" required disabled={hasOpenRequest}></textarea>
						</label>
						<label>
							<span>Preferred month</span>
							<input
								bind:value={preferredMonth}
								type="text"
								placeholder="June 2026"
								disabled={hasOpenRequest}
							/>
						</label>
						<label>
							<span>Notes</span>
							<textarea bind:value={notes} rows="4" disabled={hasOpenRequest}></textarea>
						</label>
						<button class="btn-primary" disabled={submitting || hasOpenRequest}>
							{hasOpenRequest
								? 'Open request on file'
								: submitting
									? 'Submitting…'
									: 'Submit Priority Booking request'}
						</button>
					</form>
				</div>
			</article>

			<div class="vip-side">
				<MemberIdentityPanel user={data.user} surface="vip" stats={identityStats} compact />

				<article class="panel">
					<p class="eyebrow">Request timeline</p>
					{#if requests.length === 0}
						<p class="vip-empty-copy">
							No VIP requests yet. Your next request will appear here with state and timing.
						</p>
					{:else}
						<div class="vip-request-list">
							{#each requests as request}
								<div class="vip-request-card">
									<div class="vip-request-top">
										<div>
											<p class="card-eyebrow">{formatDate(request.createdAt)}</p>
											<strong>{getRequestStatusLabel(request.status)}</strong>
										</div>
										<span class="detail-pill muted">{request.status}</span>
									</div>
									<p>{request.goals}</p>
									<div class="vip-request-meta">
										<span>Updated {formatDateTime(request.updatedAt)}</span>
										{#if request.preferredMonth}
											<span>Preferred {request.preferredMonth}</span>
										{/if}
									</div>
									{#if request.notes}
										<p class="vip-muted-copy">{request.notes}</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</article>

				<article class="panel">
					<p class="eyebrow">Confirmed calls</p>
					{#if !upcomingBooking}
						<p class="vip-empty-copy">
							No confirmed calls yet. Once ShivWorks schedules the next slot, it will appear here
							with final timing and the Zoom path.
						</p>
					{:else}
						<div class="vip-booking-list">
							<div class="vip-booking-card vip-booking-card-primary">
								<div class="vip-request-top">
									<div>
										<p class="card-eyebrow">Next confirmed slot</p>
										<strong>{formatDateTime(upcomingBooking.startsAt)}</strong>
									</div>
									<span class="detail-pill muted">
										<Clock3 size={14} />
										{formatTime(upcomingBooking.startsAt)} - {formatTime(upcomingBooking.endsAt)}
									</span>
								</div>
								{#if upcomingBooking.zoomJoinUrl}
									<a
										class="btn-secondary"
										href={upcomingBooking.zoomJoinUrl}
										target="_blank"
										rel="noreferrer"
									>
										<Video size={16} />
										Open Zoom link
									</a>
								{/if}
							</div>

							{#if archivedBookings.length > 0}
								{#each archivedBookings as booking}
									<div class="vip-booking-card">
										<div class="vip-request-top">
											<div>
												<p class="card-eyebrow">Booked call</p>
												<strong>{formatDateTime(booking.startsAt)}</strong>
											</div>
											<span class="detail-pill muted"
												>{formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}</span
											>
										</div>
										{#if booking.zoomJoinUrl}
											<a href={booking.zoomJoinUrl} target="_blank" rel="noreferrer">Join Zoom</a>
										{/if}
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</article>
			</div>
		{/if}
	</div>
</section>
