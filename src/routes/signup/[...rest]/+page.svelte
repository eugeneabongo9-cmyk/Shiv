<script lang="ts">
	import { CheckCircle2, Mail, Shield, Sparkles } from 'lucide-svelte';
	import ClerkMount from '$lib/components/ClerkMount.svelte';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import { SITE_NAME } from '$lib/constants/site';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>{data.provisioned ? 'Create your password' : 'Create account'} | {SITE_NAME}</title>
</svelte:head>

<div class="auth-shell">
	<aside class="auth-hero">
		<div class="hero-brand">
			<img src="/cobra-logo.png" alt="ShivWorks Network" />
			<span class="hb-name">The ShivWorks Network</span>
		</div>

		<div class="hero-copy">
			{#if data.provisioned}
				<p class="eyebrow">Founding member setup</p>
				<h1>Claim your access.</h1>
				<p>
					Your purchase is already provisioned. Create your password with
					{#if data.provisionedEmail}
						<strong>{data.provisionedEmail}</strong>
					{:else}
						the invited email
					{/if}
					and your membership activates automatically after signup.
				</p>
				{#if data.provisionedTier}
					<div class="signup-provisioned-badge">
						<MembershipBadge tier={data.provisionedTier} />
						{#if data.provisionedName}
							<span>Provisioned for {data.provisionedName}</span>
						{/if}
					</div>
				{/if}
			{:else}
				<p class="eyebrow">Member account setup</p>
				<h1>Create your account and enter the network.</h1>
				<p>
					Email verification happens inside Clerk. Once your account is verified, your dashboard is
					ready immediately, and your purchased access can be completed inside the product.
				</p>
			{/if}

			<ul class="hero-points">
				<li>
					<span class="hp-ico"><Mail size={18} /></span>
					Verify your email in minutes
				</li>
				<li>
					<span class="hp-ico"><CheckCircle2 size={18} /></span>
					Founding purchases link to your account automatically
				</li>
				<li>
					<span class="hp-ico"><Sparkles size={18} /></span>
					Full curriculum, live sessions, and community access
				</li>
			</ul>
		</div>

		<div class="hero-foot">ShivWorks Network · Members area</div>
	</aside>

	<main class="auth-pane">
		<div class="auth-wrap">
			<div class="mobile-brand">
				<img src="/cobra-logo.png" alt="" />
				<span>ShivWorks Network</span>
			</div>

			<div class="auth-head">
				<span class="auth-tag"><Shield size={16} /> Secure signup</span>
				<h2>{data.provisioned ? 'Create your password' : 'Create your account'}</h2>
				<p class="sub">
					{#if data.provisioned}
						Use the email from your founding member purchase to finish setup.
					{:else}
						Welcome. Fill in your details below to join the network.
					{/if}
				</p>
			</div>

			<div class="clerk-slot">
				{#key data.provisionedEmail}
					<ClerkMount
						mode="signUp"
						initialEmail={data.provisionedEmail}
						publishableKey={data.publicConfig.clerkPublishableKey}
						fallbackRedirectUrl={data.redirectTo}
					/>
				{/key}
			</div>

			<p class="auth-help">
				{#if data.provisioned}
					After you create your password, verify your email if Clerk asks — your founding purchase
					links automatically once the account is ready.
				{:else}
					Email verification happens in the form above. Once verified, your dashboard is ready and
					any purchased access can finish linking inside the product.
				{/if}
			</p>

			<div class="auth-altfoot">
				Already have an account?
				<a
					href={data.redirectTo && data.redirectTo !== '/welcome'
						? `/login?redirect=${encodeURIComponent(data.redirectTo)}`
						: '/login'}
				>
					Sign in →
				</a>
			</div>
		</div>
	</main>
</div>
