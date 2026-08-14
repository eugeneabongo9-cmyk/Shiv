<script lang="ts">
	import { Check, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-svelte';
	import {
		MEMBERSHIP_TIERS,
		PAID_MEMBERSHIP_TIERS,
		type PaidMembershipTier
	} from '$lib/constants/tiers';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import { SHIVWORKS_STORE_URL, SUPPORT_EMAIL, WC_CHECKOUT_URLS } from '$lib/constants/site';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let isLoading = $state<PaidMembershipTier | null>(null);
	let error = $state<string | null>(null);

	const redirectLabel = $derived.by(() => {
		switch (data.redirectTo) {
			case '/library':
				return 'Library';
			case '/community':
				return 'Community';
			case '/live':
				return 'Live';
			case '/vip-calls':
				return 'VIP calls';
			default:
				return 'Dashboard';
		}
	});

	const tierOffers = $derived.by(() =>
		PAID_MEMBERSHIP_TIERS.filter(
			(code) => data.requiredTier === null || code === data.requiredTier
		).map((code) => {
			const tier = MEMBERSHIP_TIERS[code];
			const price = code === 'bronze' ? data.pricing.bronzePrice : data.pricing.vipPrice;
			const spotsRemaining =
				code === 'bronze' ? data.pricing.bronzeSpotsRemaining : data.pricing.vipSpotsRemaining;
			const priceNote =
				code === 'bronze' ? data.pricing.bronzePriceNote : 'One-time · lifetime access';

			return {
				code,
				tier,
				price,
				priceNote,
				spotsRemaining,
				recommended: code === 'bronze' || data.requiredTier === code,
				highlights: tier.highlights.slice(0, code === 'bronze' ? 5 : 4),
				extraHighlights: Math.max(0, tier.highlights.length - (code === 'bronze' ? 5 : 4))
			};
		})
	);

	function startCheckout(tier: PaidMembershipTier) {
		isLoading = tier;
		error = null;
		try {
			const url = WC_CHECKOUT_URLS[tier];
			if (!url) {
				error = 'That membership option is unavailable right now.';
				isLoading = null;
				return;
			}
			window.location.href = url;
		} catch (checkoutError) {
			console.error('Checkout redirect failed', checkoutError);
			error = 'Unable to open secure checkout. Try again or email support.';
			isLoading = null;
		}
	}
</script>

<svelte:head>
	<title>Checkout | ShivWorks Network</title>
	<meta
		name="description"
		content="Choose Bronze or VIP founding membership. One-time payment, lifetime access to the ShivWorks Network."
	/>
</svelte:head>

<section class="section-block checkout-page">
	<div class="container checkout-shell">
		<ol class="checkout-steps" aria-label="Checkout progress">
			<li class="checkout-step is-current">
				<span class="checkout-step-num">1</span>
				<span>Choose plan</span>
			</li>
			<li class="checkout-step">
				<span class="checkout-step-num">2</span>
				<span>Secure payment</span>
			</li>
			<li class="checkout-step">
				<span class="checkout-step-num">3</span>
				<span>Instant access</span>
			</li>
		</ol>

		<header class="checkout-hero">
			<p class="eyebrow">Secure checkout</p>
			<h1>
				{data.requiredTier === 'vip'
					? 'Upgrade to VIP to continue'
					: 'Complete your founding membership'}
			</h1>
			<p class="checkout-hero-lede">
				{data.requiredTier === 'vip'
					? 'VIP access is required for the VIP Lounge. '
					: 'One-time payment. Lifetime access. '}
				Pay securely on
				<strong>shivworkspg.com</strong>, then return here signed in as
				<strong>{data.user.email}</strong> — access syncs in minutes.
			</p>
		</header>

		{#if error}
			<div class="status-message error checkout-error" role="alert">{error}</div>
		{/if}

		<div class="checkout-layout">
			<div class="checkout-main">
				{#each tierOffers as offer}
					<article
						class="checkout-tier-card panel"
						class:checkout-tier-card--featured={offer.recommended}
					>
						{#if offer.recommended}
							<p class="checkout-tier-badge">Most popular</p>
						{/if}

						<div class="checkout-tier-head">
							<MembershipBadge tier={offer.code} />
							<h2>{offer.tier.badge} Founding Member</h2>
							<p class="checkout-tier-desc">{offer.tier.description}</p>
						</div>

						<div class="checkout-tier-price">
							<span class="checkout-tier-amount">{offer.price}</span>
							<span class="checkout-tier-price-note">{offer.priceNote}</span>
						</div>

						{#if offer.spotsRemaining !== null && offer.spotsRemaining > 0}
							<p class="checkout-tier-urgency">
								{offer.spotsRemaining.toLocaleString()} spot{offer.spotsRemaining === 1 ? '' : 's'} left
								at this price
							</p>
						{/if}

						<ul class="checkout-tier-list">
							{#each offer.highlights as item}
								<li>
									<Check size={16} aria-hidden="true" />
									<span>{item}</span>
								</li>
							{/each}
							{#if offer.extraHighlights > 0}
								<li class="checkout-tier-more">
									<Sparkles size={16} aria-hidden="true" />
									<span
										>+ {offer.extraHighlights} more included benefit{offer.extraHighlights === 1
											? ''
											: 's'}</span
									>
								</li>
							{/if}
						</ul>

						<button
							type="button"
							class="btn {offer.recommended ? 'btn-primary' : 'btn-secondary'} checkout-tier-cta"
							disabled={isLoading !== null}
							aria-busy={isLoading === offer.code}
							onclick={() => startCheckout(offer.code)}
						>
							{isLoading === offer.code
								? 'Opening secure checkout…'
								: `Continue with ${offer.tier.badge} — ${offer.price}`}
						</button>
					</article>
				{/each}
			</div>

			<aside class="checkout-summary" aria-label="Order summary">
				<div class="checkout-summary-sticky panel">
					<p class="card-eyebrow">Order summary</p>
					<h2>What you're getting</h2>

					<ul class="checkout-summary-list">
						<li>Lifetime founding membership (not a subscription)</li>
						<li>Full curriculum as modules release</li>
						<li>Private community & member live sessions</li>
						<li>After checkout → continue to <strong>{redirectLabel}</strong></li>
					</ul>

					<div class="checkout-summary-total">
						<span>Due today</span>
						<strong>Shown on next step</strong>
						<p>Exact total appears on the ShivWorks store before you pay. No hidden fees.</p>
					</div>

					<div class="checkout-trust" aria-label="Trust and security">
						<div class="checkout-trust-item">
							<Lock size={16} aria-hidden="true" />
							<span>Secure checkout on shivworkspg.com</span>
						</div>
						<div class="checkout-trust-item">
							<ShieldCheck size={16} aria-hidden="true" />
							<span>One-time purchase · all future content included</span>
						</div>
						<div class="checkout-trust-item">
							<Mail size={16} aria-hidden="true" />
							<span>
								Questions?
								<a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a>
							</span>
						</div>
					</div>

					<p class="checkout-fine-print">
						Purchases are final. Use the same email (
						<strong>{data.user.email}</strong>) at checkout so access links automatically.
						<a href={SHIVWORKS_STORE_URL} target="_blank" rel="noreferrer">Visit store</a>
					</p>
				</div>
			</aside>
		</div>
	</div>

	<div class="checkout-mobile-bar" aria-label="Quick checkout actions">
		{#each tierOffers as offer}
			<button
				type="button"
				class="btn {offer.recommended ? 'btn-primary' : 'btn-secondary'}"
				disabled={isLoading !== null}
				onclick={() => startCheckout(offer.code)}
			>
				{isLoading === offer.code ? '…' : `${offer.tier.badge} ${offer.price}`}
			</button>
		{/each}
	</div>
</section>
