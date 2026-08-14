<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>Leaderboard | ShivWorks Network</title>
</svelte:head>

<main>
	<div class="container">
		<div class="lb">
			<div class="lb-head">
				<p class="eyebrow">Standings</p>
				<h1>Leaderboard</h1>
				<p class="lede">
					Opt-in only. Top 25 ranked by Training Points earned across courses, livestreams, and
					community.
				</p>
				<div class="tabs">
					<span class="active">This Month</span>
					<span>All Time</span>
				</div>
			</div>

			<div class="panel upd-empty" style="padding:3rem 1.5rem;text-align:center;">
				<p class="eyebrow">Launching soon</p>
				<h2 style="margin:0.5rem 0 0.75rem;font-size:1.35rem;">Rankings are not live yet.</h2>
				<p
					style="color:var(--color-fg-muted);max-width:52ch;margin:0 auto 1.25rem;line-height:1.6;"
				>
					The leaderboard ranks members by Training Points from modules, live sessions, and
					community contributions. Privacy is opt-in — enable it in your account when the surface
					launches.
				</p>
				<a class="ghost-link" href="/account">
					Opt in from account settings
					<ArrowRight size={16} />
				</a>
			</div>
		</div>
	</div>
</main>
