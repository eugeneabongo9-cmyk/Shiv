<script lang="ts">
	import { ArrowRight, Search } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>Direct messages | ShivWorks Network</title>
</svelte:head>

<div class="msg-shell">
	<aside class="threads col-rule" aria-label="Conversations">
		<div class="threads-head">
			<h1>Messages</h1>
			<div class="threads-search">
				<Search size={16} aria-hidden="true" />
				<input type="search" placeholder="Search conversations" disabled />
			</div>
		</div>
		<div class="thread-scroll">
			<p class="upd-empty">Direct messages launch soon.</p>
		</div>
	</aside>

	<main class="convo" aria-label="Conversation">
		<div class="convo-empty">
			<p class="eyebrow">Coming soon</p>
			<h2>One-to-one member conversations.</h2>
			<p>
				Members will start private threads from Find Partners or a member profile. Moderation tools
				and notification preferences ship with the first version.
			</p>
			<a class="btn btn-secondary" href="/find-partners">
				Find training partners
				<ArrowRight size={16} />
			</a>
		</div>
	</main>
</div>
