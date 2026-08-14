<script lang="ts">
	import ClerkMount from '$lib/components/ClerkMount.svelte';
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();
	const isFree = $derived(data.user.tier === 'free');
	const enabledNotificationCount = $derived(
		Object.values(data.notificationPreferences).filter(Boolean).length
	);
	const openSessionSlots = $derived(Math.max(0, 2 - data.activeSessionCount));
	const identityStats = $derived.by(() => [
		{ label: 'Active devices', value: String(data.activeSessionCount) },
		{ label: 'Open slots', value: String(openSessionSlots) },
		{ label: 'Opt-ins', value: String(enabledNotificationCount) }
	]);
</script>

<svelte:head>
	<title>Settings | ShivWorks Network</title>
</svelte:head>

<section class="section-block">
	<div class="container settings-shell">
		<div class="settings-grid">
			<div class="stack-column">
				<MemberIdentityPanel user={data.user} surface="settings" stats={identityStats} />

				<div class="panel settings-overview">
					<p class="eyebrow">Account command</p>
					<h1>Manage identity, access, and session security.</h1>
					<p>
						Your account controls live here inside the network shell. Update profile details, review
						access state, and move into session security without leaving the product.
					</p>

					<div class="settings-command-grid">
						<div>
							<span>Access lane</span>
							<strong>{isFree ? 'Preview access' : 'Paid member access'}</strong>
							<p>
								{#if isFree}
									Preview mode is active until this account moves into the full member environment.
								{:else}
									Your account is operating inside the paid member shell.
								{/if}
							</p>
						</div>
						<div>
							<span>Optional alerts</span>
							<strong>{enabledNotificationCount} enabled</strong>
							<p>Build updates, content-release alerts, and live reminders all route from here.</p>
						</div>
						<div>
							<span>Session perimeter</span>
							<strong>{data.activeSessionCount} of 2 devices active</strong>
							<p>
								{#if openSessionSlots > 0}
									{openSessionSlots} open slot{openSessionSlots === 1 ? '' : 's'} remain before the device
									cap is reached.
								{:else}
									The account is currently at the two-device limit. Revoke an older device if
									needed.
								{/if}
							</p>
						</div>
					</div>

					<div class="settings-actions">
						<a class="btn-secondary" href="/settings/sessions">Manage active sessions</a>
						{#if isFree}
							<a class="btn-primary" href="/checkout">Upgrade access</a>
						{/if}
						<a class="ghost-link" href="/dashboard">Back to dashboard</a>
					</div>
				</div>

				<div class="card-grid two-up settings-note-grid align-start">
					<article class="panel settings-note">
						<p class="card-eyebrow">Security model</p>
						<h2>Two-device session cap</h2>
						<p>
							The network keeps each account limited to two active devices. Use the session view to
							revoke old devices and keep account access clean.
						</p>
					</article>

					<article class="panel settings-note">
						<p class="card-eyebrow">Access lane</p>
						<h2>{isFree ? 'Preview access is active' : 'Paid member access is active'}</h2>
						<p>
							{#if isFree}
								This account is in preview mode right now. Bronze or VIP unlocks the private
								community, full curriculum, and broader member calendar.
							{:else}
								Your current tier unlocks the paid member environment, including the curriculum map,
								member updates, and private ShivWorks routes.
							{/if}
						</p>
					</article>
				</div>

				<form
					class="panel stack-form settings-notification-panel"
					method="POST"
					action="?/updateNotifications"
				>
					<div class="settings-embed-header">
						<p class="eyebrow">Notifications</p>
						<h2>Choose which optional emails reach this account.</h2>
						<p>
							Operational notices like security alerts and VIP scheduling still go out when
							required. These controls only affect optional member updates.
						</p>
					</div>

					{#if form?.error}
						<div class="status-message error">{form.error}</div>
					{/if}
					{#if form?.success}
						<div class="status-message">{form.success}</div>
					{/if}

					<label class="settings-toggle">
						<input
							name="buildUpdates"
							type="checkbox"
							checked={data.notificationPreferences.buildUpdates}
						/>
						<span>
							<strong>Build updates</strong>
							<small
								>Receive emailed changelog and progress updates when ShivWorks posts a new network
								briefing.</small
							>
						</span>
					</label>

					<label class="settings-toggle">
						<input
							name="contentReleaseAlerts"
							type="checkbox"
							checked={data.notificationPreferences.contentReleaseAlerts}
						/>
						<span>
							<strong>Content release alerts</strong>
							<small
								>Receive emails when new course modules go live for your access tier inside the
								library.</small
							>
						</span>
					</label>

					<label class="settings-toggle">
						<input
							name="livestreamReminders"
							type="checkbox"
							checked={data.notificationPreferences.livestreamReminders}
						/>
						<span>
							<strong>Livestream reminders</strong>
							<small
								>Receive reminder emails for the live sessions you RSVP to inside the member
								calendar.</small
							>
						</span>
					</label>

					<div class="settings-actions">
						<button class="btn-primary" type="submit">Save notification preferences</button>
					</div>
				</form>
			</div>
		</div>

		<div class="panel settings-embed-panel settings-identity-console">
			<div class="settings-embed-header">
				<p class="eyebrow">Identity console</p>
				<h2>Profile, email, password, and connected accounts.</h2>
				<p>
					Clerk handles the account-management controls here so security operations stay consistent
					across sign-in, recovery, and device trust.
				</p>
			</div>

			<div class="settings-clerk-shell">
				<ClerkMount
					mode="userProfile"
					publishableKey={data.publicConfig.clerkPublishableKey}
					fallbackRedirectUrl="/settings"
				/>
			</div>
		</div>
	</div>
</section>
