<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ArrowRight, CheckCircle2, Clock3, Film, Settings, User } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import WelcomeCountdown from '$lib/components/WelcomeCountdown.svelte';
	import UpcomingLessonsPanel from '$lib/components/UpcomingLessonsPanel.svelte';
	import { SUPPORT_EMAIL } from '$lib/constants/site';
	import { MEMBERSHIP_TIERS } from '$lib/constants/tiers';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	type WelcomeStep = {
		href: string;
		kind: 'library' | 'account' | 'settings' | 'redirect';
		title: string;
		copy: string;
		primary?: boolean;
	};

	let { data }: Props = $props();
	let polling = $state(false);
	const redirectLabel = $derived.by(() => {
		switch (data.redirectTo) {
			case '/library':
				return 'Library';
			case '/account':
				return 'Account';
			case '/settings':
				return 'Settings';
			case '/vip-calls':
				return 'VIP Lounge';
			default:
				return 'Dashboard';
		}
	});
	const nextSteps = $derived.by(() => {
		const steps: WelcomeStep[] = [
			{
				href: '/library',
				kind: 'library',
				title: 'Open the library',
				copy: 'Start with the curriculum and currently live modules.',
				primary: true
			},
			{
				href: '/account?welcome=1',
				kind: 'account',
				title: 'Confirm your account',
				copy: 'Review membership details and finish your training profile.'
			},
			{
				href: '/settings',
				kind: 'settings',
				title: 'Manage settings',
				copy: 'Set notification preferences and review active sessions.'
			}
		];

		if (
			data.redirectTo &&
			data.redirectTo !== '/library' &&
			data.redirectTo !== '/account' &&
			data.redirectTo !== '/settings' &&
			data.redirectTo !== '/account?welcome=1'
		) {
			steps.unshift({
				href: data.redirectTo,
				kind: 'redirect',
				title: `Continue to ${redirectLabel}`,
				copy: 'Return to the route you were already trying to open.'
			});
		}

		return steps.filter(
			(step, index, all) => all.findIndex((candidate) => candidate.href === step.href) === index
		);
	});
	const identityStats = $derived.by(() =>
		data.ready
			? [
					{
						label: 'Access',
						value: data.user.tier ? MEMBERSHIP_TIERS[data.user.tier].badge : 'Active'
					},
					{ label: 'Next stop', value: 'Library' },
					{ label: 'Routes live', value: String(nextSteps.length) }
				]
			: data.accessRevoked
				? [
						{ label: 'Access', value: 'Revoked' },
						{ label: 'Membership', value: 'Inactive' },
						{ label: 'Next step', value: 'Support' }
					]
				: data.needsMembershipPurchase
					? [
							{ label: 'Membership', value: 'Required' },
							{ label: 'Access', value: 'Locked' },
							{ label: 'Next step', value: 'Checkout' }
						]
					: [
							{ label: 'Checkout', value: 'Done' },
							{ label: 'Sync', value: 'Pending' },
							{ label: 'Next stop', value: redirectLabel }
						]
	);

	onMount(() => {
		if (data.ready || data.needsMembershipPurchase || data.accessRevoked) return;

		let active = true;
		let attempts = 0;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const poll = async () => {
			if (!active || data.ready || attempts >= 10) return;

			attempts += 1;
			polling = true;

			try {
				await invalidateAll();
			} catch (error) {
				console.error('Failed to refresh welcome status', error);
			} finally {
				polling = false;
			}

			if (active && !data.ready && attempts < 10) {
				timeoutId = setTimeout(poll, 4000);
			}
		};

		timeoutId = setTimeout(poll, 4000);

		return () => {
			active = false;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	});

	async function refreshStatus() {
		polling = true;
		try {
			await invalidateAll();
		} catch (error) {
			console.error('Failed to refresh welcome status', error);
		} finally {
			polling = false;
		}
	}
</script>

<svelte:head>
	<title>Welcome | ShivWorks Network</title>
</svelte:head>

<main class="dash">
	<div class="container">
		<div class="welcome-layout">
			<div class="stack-column">
				<MemberIdentityPanel
					user={data.user}
					surface={data.ready ? 'welcome' : 'upgrade'}
					stats={identityStats}
				/>

				<div class="panel welcome-status-panel">
					{#if data.ready}
						<div class="status-icon success">
							<CheckCircle2 size={28} />
						</div>
						<p class="eyebrow">Access granted</p>
						<h1>You are in.</h1>
						<p>
							Your membership is active. Continue into the <strong>Library</strong>, confirm your
							<strong>Account</strong>, or manage <strong>Settings</strong>.
						</p>
						<div class="inline-membership">
							<span>Current membership</span>
							<MembershipBadge tier={data.user.tier} />
						</div>
						<div class="welcome-actions">
							<a class="btn-primary" href="/library">
								Open the library
								<ArrowRight size={16} />
							</a>
							<a class="btn-secondary" href="/account?welcome=1">Confirm account</a>
							<a class="ghost-link" href="/settings">Open settings</a>
						</div>
					{:else if data.accessRevoked}
						<div class="status-icon pending">
							<Clock3 size={28} />
						</div>
						<p class="eyebrow">Access revoked</p>
						<h1>This membership is no longer active.</h1>
						<p>
							A refund or cancellation removed paid access from this account. If you believe this is
							a mistake, contact
							<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
							with your purchase email.
						</p>
						<div class="welcome-actions">
							<a class="btn-primary" href="/checkout">View membership options</a>
							<a class="ghost-link" href="/">Back to home</a>
						</div>
					{:else if data.needsMembershipPurchase}
						<div class="status-icon pending">
							<Clock3 size={28} />
						</div>
						<p class="eyebrow">Membership required</p>
						<h1>Your account is ready, but member content is locked.</h1>
						<p>
							You are signed in as <strong>{data.user.name}</strong>, but this account does not have
							an active Bronze or VIP membership yet. Curriculum, live sessions, and community
							content stay locked until you complete a founding membership purchase.
						</p>
						<div class="welcome-actions">
							<a
								class="btn-primary"
								href={`/checkout?redirect=${encodeURIComponent(data.redirectTo)}`}
							>
								Choose Bronze or VIP
								<ArrowRight size={16} />
							</a>
							<a class="ghost-link" href="/">Back to home</a>
						</div>
					{:else}
						<div class="status-icon pending">
							<Clock3 size={28} />
						</div>
						<p class="eyebrow">Processing</p>
						<h1>Your access is still syncing.</h1>
						<p>
							{#if data.emailMismatch && data.expectedCheckoutEmail}
								Your account is signed in, but the purchase is still tied to
								<strong>{data.expectedCheckoutEmail}</strong>. Sign in with that same email to claim
								your membership.
							{:else if data.pendingImport}
								Your store purchase is recorded and waiting to attach to this account. The page will
								keep checking automatically for the next minute.
							{:else}
								Store checkout completed successfully, but your paid membership is not active on
								this account yet. The page will keep checking automatically for the next minute.
							{/if}
							If this does not resolve quickly, contact
							<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
						</p>
						<div class="welcome-actions">
							<button
								class="btn-secondary"
								type="button"
								onclick={refreshStatus}
								disabled={polling}
							>
								{polling ? 'Checking…' : 'Refresh access'}
							</button>
							{#if data.emailMismatch && data.expectedCheckoutEmail}
								<a
									class="btn-primary"
									href={`/login?email=${encodeURIComponent(data.expectedCheckoutEmail)}&redirect=${encodeURIComponent(`/welcome?email=${encodeURIComponent(data.expectedCheckoutEmail)}`)}`}
								>
									Sign in with purchase email
								</a>
							{/if}
							<a class="ghost-link" href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a>
						</div>
					{/if}
				</div>
			</div>

			<article class="panel">
				{#if data.ready && data.experience}
					<div class="section-heading compact">
						<div>
							<p class="eyebrow">What to expect, when</p>
							<h2>{data.user.name}, your {data.experience.tierBadge} lane is active.</h2>
							<p>{data.experience.cohortSummary}</p>
						</div>
						<div class="inline-membership">
							<span>Membership</span>
							<MembershipBadge tier={data.user.tier} />
						</div>
					</div>

					<WelcomeCountdown countdown={data.experience.countdown} />

					<div class="welcome-expect-block">
						<p class="card-eyebrow">Tier benefits</p>
						<ul class="welcome-expect-list">
							{#each data.experience.tierHighlights as highlight}
								<li>{highlight}</li>
							{/each}
						</ul>
					</div>

					<div class="welcome-expect-block">
						<p class="card-eyebrow">Where to be</p>
						<ul class="welcome-expect-list">
							{#each data.experience.whatToExpect as line}
								<li>{line}</li>
							{/each}
						</ul>
					</div>

					<UpcomingLessonsPanel
						tracker={{
							upcoming: data.experience.upcoming,
							countdown: data.experience.countdown
						}}
						showCountdown={false}
					/>

					<div class="section-heading compact welcome-next-heading">
						<div>
							<p class="eyebrow">Next moves</p>
							<h2>Start with Library, Account, and Settings.</h2>
							<p>
								These routes are live now. Use them to begin training, confirm membership, and
								manage sessions.
							</p>
						</div>
					</div>

					<div class="welcome-next-grid">
						{#each nextSteps as step}
							<a class="welcome-route-card" href={step.href}>
								{#if step.kind === 'library'}
									<Film size={18} />
								{:else if step.kind === 'account'}
									<User size={18} />
								{:else if step.kind === 'settings'}
									<Settings size={18} />
								{:else}
									<ArrowRight size={18} />
								{/if}
								<div>
									<p class="card-eyebrow">{step.primary ? 'Primary' : 'Next route'}</p>
									<strong>{step.title}</strong>
									<p>{step.copy}</p>
								</div>
							</a>
						{/each}
					</div>
				{:else if data.ready}
					<div class="section-heading compact">
						<div>
							<p class="eyebrow">Next moves</p>
							<h2>Library, Account, and Settings.</h2>
						</div>
						<div class="inline-membership">
							<span>Access lane</span>
							<MembershipBadge tier={data.user.tier} />
						</div>
					</div>
					<div class="welcome-next-grid">
						{#each nextSteps as step}
							<a class="welcome-route-card" href={step.href}>
								{#if step.kind === 'library'}
									<Film size={18} />
								{:else if step.kind === 'account'}
									<User size={18} />
								{:else if step.kind === 'settings'}
									<Settings size={18} />
								{:else}
									<ArrowRight size={18} />
								{/if}
								<div>
									<p class="card-eyebrow">{step.primary ? 'Primary' : 'Next route'}</p>
									<strong>{step.title}</strong>
									<p>{step.copy}</p>
								</div>
							</a>
						{/each}
					</div>
				{:else if data.accessRevoked}
					<div class="section-heading compact">
						<div>
							<p class="eyebrow">Access status</p>
							<h2>Paid access is inactive on this account.</h2>
							<p>
								Refunded and cancelled founding purchases revoke membership immediately. Contact
								support if you need the purchase email rematched.
							</p>
						</div>
					</div>
				{:else if data.needsMembershipPurchase}
					<div class="section-heading compact">
						<div>
							<p class="eyebrow">Unlock access</p>
							<h2>Purchase a membership to enter the network.</h2>
							<p>
								Bronze and VIP founding memberships unlock the curriculum library, live member
								touchpoints, and the private community lane once payment clears.
							</p>
						</div>
					</div>

					<div class="welcome-sync-list">
						<div class="stack-item">
							<CheckCircle2 size={18} />
							<div>
								<strong>Account created</strong>
								<p>Your ShivWorks Network login is ready. No additional signup is needed.</p>
							</div>
						</div>
						<div class="stack-item">
							<Clock3 size={18} />
							<div>
								<strong>Membership not active</strong>
								<p>
									Content stays locked until you choose Bronze or VIP and finish checkout on the
									ShivWorks store.
								</p>
							</div>
						</div>
						<div class="stack-item">
							<ArrowRight size={18} />
							<div>
								<strong>Access unlocks after purchase</strong>
								<p>
									Once payment clears, your membership syncs to this account and you can continue
									into <strong>{redirectLabel}</strong>.
								</p>
							</div>
						</div>
					</div>
				{:else}
					<div class="section-heading compact">
						<div>
							<p class="eyebrow">Sync status</p>
							<h2>What happens next.</h2>
							<p>
								The handoff is waiting on the membership sync. The page keeps checking
								automatically, but the underlying route after upgrade is already locked in.
							</p>
						</div>
					</div>

					<div class="welcome-sync-list">
						<div class="stack-item">
							<CheckCircle2 size={18} />
							<div>
								<strong>Store checkout completed</strong>
								<p>Your payment is already done. No second purchase is needed.</p>
							</div>
						</div>
						<div class="stack-item">
							<Clock3 size={18} />
							<div>
								<strong>Membership sync pending</strong>
								<p>
									The webhook is still updating the account before the product opens the full lane.
								</p>
							</div>
						</div>
						<div class="stack-item">
							<ArrowRight size={18} />
							<div>
								<strong>Next route preserved</strong>
								<p>
									Once the sync clears, the handoff will continue into <strong
										>{redirectLabel}</strong
									>.
								</p>
							</div>
						</div>
					</div>
				{/if}
			</article>
		</div>
	</div>
</main>
