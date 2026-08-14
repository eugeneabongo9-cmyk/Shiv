<script lang="ts">
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import ProfileChips from '$lib/components/ProfileChips.svelte';
	import type { MemberProfileRecord } from '$lib/server/db/shivworks';

	interface Props {
		user: NonNullable<App.Locals['user']>;
		surface?: 'dashboard' | 'community' | 'live' | 'vip' | 'settings' | 'upgrade' | 'welcome';
		updatesCount?: number | null;
		availableCourseCount?: number | null;
		eventsCount?: number | null;
		stats?: IdentityStat[] | null;
		compact?: boolean;
		profile?: Pick<
			MemberProfileRecord,
			'locationCity' | 'locationState' | 'background' | 'ecqcAlumni' | 'mucAlumni' | 'ewoAlumni'
		> | null;
	}

	type IdentityCapability = {
		title: string;
		copy: string;
	};

	type IdentityStat = {
		label: string;
		value: string;
	};

	let {
		user,
		surface = 'dashboard',
		updatesCount = null,
		availableCourseCount = null,
		eventsCount = null,
		stats = null,
		compact = false,
		profile = null
	}: Props = $props();

	const eyebrowLabel = $derived.by(() => {
		switch (surface) {
			case 'community':
				return 'Community identity';
			case 'live':
				return 'Live identity';
			case 'vip':
				return 'VIP identity';
			case 'settings':
				return 'Account identity';
			case 'upgrade':
				return 'Upgrade identity';
			case 'welcome':
				return 'Access identity';
			default:
				return 'Member identity';
		}
	});

	const initials = $derived.by(() => {
		const tokens = user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

		return tokens.length > 0 ? tokens.map((token) => token[0]?.toUpperCase() ?? '').join('') : 'SW';
	});

	const laneLabel = $derived.by(() => {
		if (user.role === 'admin') {
			switch (surface) {
				case 'live':
					return 'Admin live lane';
				case 'vip':
					return 'Admin VIP lane';
				default:
					return 'Admin command lane';
			}
		}

		if (surface === 'live') {
			switch (user.tier) {
				case 'vip':
					return 'VIP live lane';
				case 'bronze':
					return 'Member live lane';
				case 'free':
					return 'Member live lane';
				default:
					return 'Live access pending';
			}
		}

		if (surface === 'vip') {
			return 'VIP call lane';
		}

		if (surface === 'settings') {
			switch (user.tier) {
				case 'vip':
					return 'VIP account lane';
				case 'bronze':
					return 'Member account lane';
				case 'free':
					return 'Preview account lane';
				default:
					return 'Account setup pending';
			}
		}

		if (surface === 'upgrade') {
			switch (user.tier) {
				case 'vip':
					return 'VIP upgrade review';
				case 'bronze':
					return 'Member upgrade review';
				case 'free':
					return 'Preview-to-member handoff';
				default:
					return 'Access handoff pending';
			}
		}

		if (surface === 'welcome') {
			switch (user.tier) {
				case 'vip':
					return 'VIP access active';
				case 'bronze':
					return 'Member access active';
				case 'free':
					return 'Preview access active';
				default:
					return 'Access sync pending';
			}
		}

		switch (user.tier) {
			case 'vip':
				return 'VIP distinction active';
			case 'bronze':
				return 'Member lane';
			case 'free':
				return 'Preview lane';
			default:
				return 'Access pending';
		}
	});

	const summary = $derived.by(() => {
		if (user.role === 'admin') {
			if (surface === 'live') {
				return 'Your admin identity carries into the live lane so event visibility, reminders, and member-facing timing can be judged from inside the same shell.';
			}

			if (surface === 'vip') {
				return 'Your admin identity carries into the VIP lane so premium request flow, booking state, and member-facing clarity stay reviewable inside the same shell.';
			}

			return 'Your admin identity carries across the ShivWorks network while still retaining the member-facing product shell.';
		}

		if (surface === 'community') {
			switch (user.tier) {
				case 'vip':
					return 'Your VIP distinction should carry cleanly into the discussion lane so community access feels earned, not generic.';
				case 'bronze':
					return 'Your paid member identity should follow you into discussion so the community reads like part of the product, not a side tool.';
				default:
					return 'You are operating from the preview lane. Upgrade when you want the private member discussion surface.';
			}
		}

		if (surface === 'live') {
			switch (user.tier) {
				case 'vip':
					return 'Your VIP distinction should carry into the live lane so reminders, active sessions, and member touchpoints feel attached to your account, not detached from it.';
				case 'bronze':
					return 'Your paid member identity should stay visible while you move through reminders, active sessions, and the broader live queue.';
				default:
					return 'Public touchpoints stay visible here. Activate membership for the full event calendar and private session routing.';
			}
		}

		if (surface === 'vip') {
			return 'Your VIP identity should stay visible through request review, confirmed booking, and Zoom access so this lane reads like a real premium operating path.';
		}

		if (surface === 'settings') {
			switch (user.tier) {
				case 'vip':
					return 'Your VIP identity should carry through profile control, notification preferences, and device security so the premium lane feels coherent end to end.';
				case 'bronze':
					return 'Profile, notifications, and session security should feel like part of the same paid member shell as training, live sessions, and community.';
				default:
					return 'Even the preview lane should give you clear control over identity, notifications, and trusted devices before you move deeper into the network.';
			}
		}

		if (surface === 'upgrade') {
			switch (user.tier) {
				case 'vip':
				case 'bronze':
					return 'This account already has paid-member access, so the upgrade lane should only act as a confirmation handoff back into the product.';
				case 'free':
					return 'You are signed in and moving from the preview lane into the full ShivWorks member environment without losing route context.';
				default:
					return 'Your account is ready for Stripe checkout. Once payment clears, the welcome handoff should route you straight back into the product shell.';
			}
		}

		if (surface === 'welcome') {
			switch (user.tier) {
				case 'vip':
					return 'VIP access is active. Your premium lane should now carry cleanly into curriculum, private community, live touchpoints, and quarterly VIP calls.';
				case 'bronze':
					return 'Member access is active. You can now move directly into the full curriculum, live lane, and private community without leaving the shell.';
				case 'free':
					return 'Preview access is still active on this account. Upgrade when you want the full member environment and private routes.';
				default:
					return 'Your access state is still settling. Once the membership sync completes, this lane should become the clean handoff into the product.';
			}
		}

		switch (user.tier) {
			case 'vip':
				return 'VIP access is active across the curriculum, member touchpoints, and priority booking paths inside the network.';
			case 'bronze':
				return 'Member access is active across the curriculum, live lane, and the private discussion surface.';
			case 'free':
				return 'Preview access focuses on the curriculum shell and public briefings before you activate the full member environment.';
			default:
				return 'Account identity is live, but entitlement still needs to be completed for the full member environment.';
		}
	});

	const capabilities = $derived.by((): IdentityCapability[] => {
		if (user.role === 'admin') {
			if (surface === 'live') {
				return [
					{
						title: 'Member-facing timing',
						copy: 'You can verify whether session status, reminders, and live-state transitions still read clearly inside the member shell.'
					},
					{
						title: 'Operational oversight',
						copy: 'Event publishing and RSVP behavior stay grounded in the same live lane members actually use.'
					},
					{
						title: 'Admin continuity',
						copy: 'The admin account should still feel like part of the product, not a detached back-office workflow.'
					}
				];
			}

			if (surface === 'vip') {
				return [
					{
						title: 'Premium workflow review',
						copy: 'You can judge whether request state, confirmed booking details, and follow-up actions stay coherent from the member view.'
					},
					{
						title: 'Admin authority',
						copy: 'Scheduling, approval, and booking operations still route through the admin lane on this account.'
					},
					{
						title: 'Continuity check',
						copy: 'The VIP lane should feel premium without breaking the broader member shell or introducing separate product logic.'
					}
				];
			}

			if (surface === 'settings') {
				return [
					{
						title: 'Identity control',
						copy: 'Profile, email, recovery, and account trust stay attached to the same product shell members already use.'
					},
					{
						title: 'Session perimeter',
						copy: 'Device cap, revocation, and session review should read like deliberate security policy rather than a raw utility page.'
					},
					{
						title: 'Policy continuity',
						copy: 'Admin review should still happen from inside the member-facing shell so security decisions stay grounded in the real UX.'
					}
				];
			}

			if (surface === 'upgrade') {
				return [
					{
						title: 'Route continuity',
						copy: 'Upgrade should preserve the destination you were headed toward before payment instead of forcing a disconnected checkout detour.'
					},
					{
						title: 'Access clarity',
						copy: 'Tier choice, current lane, and what changes after payment should all stay visible inside the same product shell.'
					},
					{
						title: 'Admin review',
						copy: 'Even the upgrade path should remain inspectable from the member-facing shell so the transition can be judged like any other product lane.'
					}
				];
			}

			if (surface === 'welcome') {
				return [
					{
						title: 'Access handoff',
						copy: 'This page should confirm that identity, entitlement, and the next route are all aligned before the member continues.'
					},
					{
						title: 'Next-step continuity',
						copy: 'Library, community, live sessions, and VIP paths should read like obvious continuations of the same product after payment.'
					},
					{
						title: 'Shell consistency',
						copy: 'The welcome state should still feel like the ShivWorks network, not a detached post-checkout receipt page.'
					}
				];
			}

			return [
				{
					title: 'Member-facing shell',
					copy: 'You still experience the member environment while overseeing course, update, and event operations.'
				},
				{
					title: 'Admin authority',
					copy: 'Access, publishing, scheduling, and provisioning all route through the admin lane on this account.'
				},
				{
					title: 'Network oversight',
					copy: 'Use the product context to judge whether member-facing changes still read cleanly inside the shell.'
				}
			];
		}

		switch (user.tier) {
			case 'vip':
				return [
					{
						title: 'VIP distinction',
						copy: 'The badge and lane should remain visible across community, booking, and the broader member shell.'
					},
					{
						title: 'Priority routing',
						copy: 'VIP call requests and higher-touch paths stay attached to this account inside the product.'
					},
					{
						title: 'Full access',
						copy: 'Curriculum, build updates, live touchpoints, and private community are all active on this lane.'
					}
				];
			case 'bronze':
				if (surface === 'settings') {
					return [
						{
							title: 'Identity console',
							copy: 'Profile details, email, password, and connected-account settings stay available without leaving the ShivWorks network.'
						},
						{
							title: 'Session perimeter',
							copy: 'Use the session lane to keep the two-device cap clean and revoke any device that should no longer hold access.'
						},
						{
							title: 'Notification control',
							copy: 'Optional build updates, release alerts, and reminder emails should feel like account controls, not separate mailing-list settings.'
						}
					];
				}

				if (surface === 'upgrade') {
					return [
						{
							title: 'Current lane',
							copy: 'You are still operating in the preview lane until Stripe grants the broader member entitlement.'
						},
						{
							title: 'Member unlock',
							copy: 'Paid checkout moves this account into the full curriculum, live member calendar, and private community shell.'
						},
						{
							title: 'Preserved destination',
							copy: 'Once payment is complete, the flow should return you to the route you were trying to reach instead of making you start over.'
						}
					];
				}

				if (surface === 'welcome') {
					return [
						{
							title: 'Member shell',
							copy: 'Your account now carries full member access across the curriculum, live touchpoints, and private community.'
						},
						{
							title: 'Immediate next move',
							copy: 'The next route after checkout should be explicit so the upgrade feels like part of the product journey, not an interruption.'
						},
						{
							title: 'Ongoing continuity',
							copy: 'The same account identity should now follow you into every core member lane without a second setup step.'
						}
					];
				}

				if (surface === 'live') {
					return [
						{
							title: 'Member live access',
							copy: 'This lane keeps the active queue, reminder state, and upcoming touchpoints attached to your paid member account.'
						},
						{
							title: 'Reminder control',
							copy: 'Use RSVP state to turn the live page into a practical event calendar instead of a passive list.'
						},
						{
							title: 'Operational queue',
							copy: 'The spotlight session and event stack should make it obvious what is active now and what follows next.'
						}
					];
				}

				return [
					{
						title: 'Private member access',
						copy: 'You are inside the paid lane with full curriculum, live member touchpoints, and community access.'
					},
					{
						title: 'Curriculum first',
						copy: 'The library, build log, and community should all reinforce the same training path instead of splitting context.'
					},
					{
						title: 'Operational updates',
						copy: 'Use the dashboard and updates lane as the command layer for what is live, next, and still staging.'
					}
				];
			default:
				if (surface === 'settings') {
					return [
						{
							title: 'Profile basics',
							copy: 'The preview lane still gives you a real identity console so the account feels established before any upgrade decision.'
						},
						{
							title: 'Device trust',
							copy: 'Session review keeps account access clean even before you step into the broader paid member environment.'
						},
						{
							title: 'Upgrade readiness',
							copy: 'Notification and identity controls should remain the same when you move from preview access into membership.'
						}
					];
				}

				if (surface === 'upgrade') {
					return [
						{
							title: 'Preview lane',
							copy: 'The preview lane stays open so you can inspect the shell before deciding to move into the full member environment.'
						},
						{
							title: 'Member expansion',
							copy: 'Upgrade adds the broader curriculum, private community, and fuller live calendar without changing the underlying account identity.'
						},
						{
							title: 'Return path',
							copy: 'After checkout, the flow should hand you back to the route that originally triggered the upgrade prompt.'
						}
					];
				}

				if (surface === 'welcome') {
					return [
						{
							title: 'Preview lane continuity',
							copy: 'The preview lane should still feel complete and intentional even before any upgrade occurs.'
						},
						{
							title: 'Upgrade readiness',
							copy: 'When you decide to move into the member shell later, the route and identity handoff should stay familiar.'
						},
						{
							title: 'Clear next move',
							copy: 'This surface should still make it obvious where to go next inside the product.'
						}
					];
				}

				if (surface === 'live') {
					return [
						{
							title: 'Open touchpoints',
							copy: 'The preview lane stays focused on sessions ShivWorks intentionally opens to public access.'
						},
						{
							title: 'Upgrade boundary',
							copy: 'Member events remain behind the broader live lane until access is activated.'
						},
						{
							title: 'Lightweight live briefings',
							copy: 'Even the preview lane should still feel like the same network members move deeper into later.'
						}
					];
				}

				if (surface === 'vip') {
					return [
						{
							title: 'Priority review',
							copy: 'One VIP request at a time keeps the quarterly call lane deliberate and reviewable.'
						},
						{
							title: 'Confirmed booking',
							copy: 'Zoom timing, join details, and state changes stay attached to this account once the slot is set.'
						},
						{
							title: 'Quarterly continuity',
							copy: 'Past requests and booked calls remain visible so the premium workflow reads like a real operating lane.'
						}
					];
				}

				return [
					{
						title: 'Preview lane',
						copy: 'Preview access keeps the shell open for the curriculum, briefings, and public touchpoints.'
					},
					{
						title: 'Upgrade path',
						copy: 'The private community and full curriculum stay behind the paid-member lane until access is upgraded.'
					},
					{
						title: 'Real product context',
						copy: 'Even in the preview lane, the product should still feel like the same network members graduate into later.'
					}
				];
		}
	});

	const defaultStats = $derived.by((): IdentityStat[] =>
		[
			updatesCount === null
				? null
				: {
						label: surface === 'community' ? 'Briefings' : 'Updates',
						value: String(updatesCount)
					},
			availableCourseCount === null
				? null
				: {
						label: 'Ready now',
						value: String(availableCourseCount)
					},
			eventsCount === null
				? null
				: {
						label: surface === 'community' ? 'Touchpoints' : 'Live',
						value: String(eventsCount)
					}
		].filter((item): item is IdentityStat => item !== null)
	);

	const resolvedStats = $derived.by(() => (stats && stats.length > 0 ? stats : defaultStats));
</script>

<article class:compact class="member-identity-panel">
	<div class="member-identity-head">
		<div class="member-identity-mark">{initials}</div>
		<div class="member-identity-copy">
			<p class="card-eyebrow">{eyebrowLabel}</p>
			<h2>{user.name}</h2>
			<p>{user.email}</p>
		</div>
	</div>

	<div class="member-identity-meta">
		<MembershipBadge tier={user.tier} />
		<span class:vip={user.tier === 'vip'} class="member-identity-lane">{laneLabel}</span>
	</div>

	{#if profile}
		<ProfileChips {profile} size={compact ? 'sm' : 'md'} />
	{/if}

	<p class="member-identity-summary">{summary}</p>

	{#if resolvedStats.length > 0}
		<div class="member-identity-stats">
			{#each resolvedStats as stat}
				<div class="member-identity-stat">
					<span>{stat.label}</span>
					<strong>{stat.value}</strong>
				</div>
			{/each}
		</div>
	{/if}

	<div class="member-identity-capabilities">
		{#each capabilities as capability}
			<div class="member-identity-capability">
				<strong>{capability.title}</strong>
				<p>{capability.copy}</p>
			</div>
		{/each}
	</div>
</article>

<style>
	.member-identity-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.2rem;
		border-radius: 1.25rem;
		border: 1px solid rgba(188, 19, 19, 0.14);
		background:
			radial-gradient(circle at top right, rgba(188, 19, 19, 0.12), transparent 28%),
			rgba(255, 255, 255, 0.025);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
	}

	.member-identity-panel.compact {
		padding: 1.05rem;
	}

	.member-identity-head {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.member-identity-mark {
		width: 3.4rem;
		height: 3.4rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 1rem;
		border: 1px solid rgba(188, 19, 19, 0.2);
		background:
			radial-gradient(circle at top left, rgba(188, 19, 19, 0.16), transparent 52%),
			rgba(18, 16, 13, 0.98);
		color: var(--color-accent);
		font-family: var(--font-mono);
		font-size: 0.92rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.member-identity-copy h2 {
		margin: 0 0 0.2rem;
		font-size: clamp(1.35rem, 2.2vw, 1.85rem);
	}

	.member-identity-copy p {
		margin: 0;
		color: var(--color-fg-secondary);
	}

	.member-identity-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
	}

	.member-identity-lane {
		display: inline-flex;
		align-items: center;
		padding: 0.38rem 0.72rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.member-identity-lane.vip {
		background: rgba(188, 19, 19, 0.12);
		border-color: rgba(188, 19, 19, 0.24);
		color: var(--color-accent);
	}

	.member-identity-summary {
		margin: 0;
		color: var(--color-fg-secondary);
		line-height: 1.65;
	}

	.member-identity-stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.member-identity-stat,
	.member-identity-capability {
		padding: 0.95rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(188, 19, 19, 0.12);
		background: rgba(255, 255, 255, 0.02);
	}

	.member-identity-stat span {
		display: block;
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.member-identity-stat strong {
		display: block;
		margin-top: 0.35rem;
		font-family: var(--font-display);
		font-size: 1.3rem;
		line-height: 1;
	}

	.member-identity-capabilities {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.member-identity-panel.compact .member-identity-stats {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.member-identity-panel.compact .member-identity-capabilities {
		grid-template-columns: 1fr;
	}

	.member-identity-capability strong {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.98rem;
	}

	.member-identity-capability p {
		margin: 0;
		color: var(--color-fg-secondary);
		line-height: 1.55;
	}

	@media (max-width: 720px) {
		.member-identity-head {
			align-items: flex-start;
		}

		.member-identity-stats,
		.member-identity-capabilities {
			grid-template-columns: 1fr;
		}
	}
</style>
