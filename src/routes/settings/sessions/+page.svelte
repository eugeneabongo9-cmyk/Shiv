<script lang="ts">
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import { MEMBER_ACTIVE_SESSION_LIMIT } from '$lib/constants/session-policy';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let revoking = $state<string | null>(null);
	let feedback = $state<string | null>(null);
	const activeSessionCount = $derived(data.sessions.length);
	const openSessionSlots = $derived(Math.max(0, MEMBER_ACTIVE_SESSION_LIMIT - activeSessionCount));
	const currentSession = $derived(
		data.sessions.find((session) => session.sessionId === data.currentSessionId) ?? null
	);
	const identityStats = $derived.by(() => [
		{ label: 'Active devices', value: String(activeSessionCount) },
		{ label: 'Open slots', value: String(openSessionSlots) },
		{ label: 'Trusted now', value: currentSession ? '1' : '0' }
	]);

	async function revoke(sessionId: string) {
		revoking = sessionId;
		feedback = null;
		try {
			const response = await fetch(`/api/settings/sessions/${sessionId}/revoke`, {
				method: 'POST'
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				feedback = result.error || 'Unable to revoke session.';
				return;
			}
			window.location.reload();
		} catch (error) {
			console.error('Failed to revoke session', error);
			feedback = 'Unable to revoke session.';
		} finally {
			revoking = null;
		}
	}
</script>

<svelte:head>
	<title>Active Sessions | ShivWorks Network</title>
</svelte:head>

<section class="section-block">
	<div class="container settings-shell">
		<div class="settings-grid">
			<div class="stack-column">
				<MemberIdentityPanel user={data.user} surface="settings" stats={identityStats} compact />

				<div class="panel settings-session-hero">
					<p class="eyebrow">Session security</p>
					<h1>See where your account is signed in.</h1>
					<p>
						The platform keeps the account limited to two active devices at a time. Revoke old
						devices here when you want to tighten the account perimeter.
					</p>

					<div class="settings-session-summary">
						<div class="settings-session-stat">
							<span>Active devices</span>
							<strong>{activeSessionCount}</strong>
							<p>
								The account currently has {activeSessionCount} trusted device{activeSessionCount ===
								1
									? ''
									: 's'} on file.
							</p>
						</div>
						<div class="settings-session-stat">
							<span>Open device slots</span>
							<strong>{openSessionSlots}</strong>
							<p>
								{#if openSessionSlots > 0}
									You still have room before the two-device limit is reached.
								{:else}
									The device cap is full. Revoke an older session before adding another trusted
									device.
								{/if}
							</p>
						</div>
						<div class="settings-session-stat">
							<span>Current device</span>
							<strong>{currentSession ? currentSession.deviceLabel : 'Unknown'}</strong>
							<p>
								{#if currentSession}
									This is the device currently holding the active browser session.
								{:else}
									The current browser session is not yet mirrored in the session list.
								{/if}
							</p>
						</div>
					</div>

					<div class="settings-actions">
						<a class="btn-secondary" href="/settings">Back to account settings</a>
						<a class="ghost-link" href="/dashboard">Open dashboard</a>
					</div>
				</div>
			</div>

			<div class="panel settings-session-list-panel">
				<div class="section-heading compact">
					<p class="eyebrow">Trusted devices</p>
					<h2>Current session perimeter</h2>
					<p>
						{data.sessions.length} session{data.sessions.length === 1 ? '' : 's'} currently visible on
						this account.
					</p>
				</div>

				{#if feedback}
					<div class="status-message error">{feedback}</div>
				{/if}

				<div class="list-stack settings-session-list">
					{#each data.sessions as session}
						<div class="panel session-card session-card-detailed">
							<div class="session-card-copy">
								<div class="session-card-top">
									<div>
										<p class="card-eyebrow">Trusted device</p>
										<strong>{session.deviceLabel}</strong>
									</div>
									{#if data.currentSessionId === session.sessionId}
										<span class="detail-pill">Current device</span>
									{:else}
										<span class="detail-pill muted">Secondary device</span>
									{/if}
								</div>

								<div class="session-card-meta">
									<div>
										<span>IP address</span>
										<strong>{session.ipAddress || 'IP unavailable'}</strong>
									</div>
									<div>
										<span>Browser / device</span>
										<strong>{session.userAgent || 'Device details unavailable'}</strong>
									</div>
									<div>
										<span>Signed in</span>
										<strong>{new Date(session.createdAt).toLocaleString()}</strong>
									</div>
									<div>
										<span>Last active</span>
										<strong>{new Date(session.lastActiveAt).toLocaleString()}</strong>
									</div>
								</div>
							</div>

							<div class="session-actions">
								{#if data.currentSessionId === session.sessionId}
									<span class="membership-badge">Protected</span>
								{:else}
									<button
										class="btn-secondary"
										disabled={revoking === session.sessionId}
										onclick={() => revoke(session.sessionId)}
									>
										{revoking === session.sessionId ? 'Revoking…' : 'Revoke access'}
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>
