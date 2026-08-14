<script lang="ts">
	import { Play, Shield, Users, Zap } from 'lucide-svelte';
	import ClerkMount from '$lib/components/ClerkMount.svelte';
	import { SITE_NAME } from '$lib/constants/site';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>Sign in | {SITE_NAME}</title>
</svelte:head>

<div class="auth-shell">
	<aside class="auth-hero">
		<div class="hero-brand">
			<img src="/cobra-logo.png" alt="ShivWorks Network" />
			<span class="hb-name">The ShivWorks Network</span>
		</div>

		<div class="hero-copy">
			<p class="eyebrow">Member access</p>
			<h1>Train with intent.</h1>
			<p>
				Your home for ShivWorks curriculum, live sessions, and the community working the same
				problems you are.
			</p>
			<ul class="hero-points">
				<li>
					<span class="hp-ico"><Play size={18} /></span>
					Full course library & module tracking
				</li>
				<li>
					<span class="hp-ico"><Zap size={18} /></span>
					Live calls and event replays
				</li>
				<li>
					<span class="hp-ico"><Users size={18} /></span>
					Members-only community & partner finder
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
				<span class="auth-tag"><Shield size={16} /> Secure sign-in</span>
				<h2>Sign in</h2>
				<p class="sub">
					Welcome back. Use the email and password for your ShivWorks Network account.
				</p>
			</div>

			{#if data.sessionRevoked}
				<p class="auth-help">
					Your previous session was signed out. Sign in again to continue securely.
				</p>
			{/if}

			<div class="clerk-slot">
				<ClerkMount
					mode="signIn"
					publishableKey={data.publicConfig.clerkPublishableKey}
					fallbackRedirectUrl={data.redirectTo}
					initialEmail={data.prefillEmail}
				/>
			</div>

			<p class="auth-help">
				Forgot your password? Use <strong>Forgot password</strong> in the form above. Need to finish email
				verification? Continue in the same form after signup — Clerk walks you through the code.
			</p>

			<div class="auth-altfoot">
				New to the Network?
				<a
					href={data.redirectTo && data.redirectTo !== '/dashboard'
						? `/signup?redirect=${encodeURIComponent(data.redirectTo)}`
						: '/signup'}
				>
					Create an account →
				</a>
			</div>
		</div>
	</main>
</div>
