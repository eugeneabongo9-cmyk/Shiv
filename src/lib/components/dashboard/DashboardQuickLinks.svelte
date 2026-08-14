<script lang="ts">
	import { ArrowRight, Film, Settings, Shield, User, Users } from 'lucide-svelte';
	import type { DashboardQuickLink } from '$lib/dashboard/quick-links';

	interface Props {
		links: DashboardQuickLink[];
	}

	let { links }: Props = $props();

	function iconFor(kind: DashboardQuickLink['kind']) {
		switch (kind) {
			case 'library':
				return Film;
			case 'account':
				return User;
			case 'settings':
				return Settings;
			case 'vip':
				return Users;
			case 'upgrade':
				return ArrowRight;
			case 'admin':
				return Shield;
			case 'welcome':
				return ArrowRight;
			default:
				return ArrowRight;
		}
	}
</script>

<article class="panel dashboard-hub-block dashboard-hub-quicklinks">
	<div class="section-heading compact dashboard-hub-block-heading">
		<div>
			<p class="eyebrow">Quick links</p>
			<h2>Move inside the network</h2>
		</div>
	</div>

	<div class="dashboard-hub-quicklinks-grid">
		{#each links as link (link.href + link.kind)}
			{@const Icon = iconFor(link.kind)}
			<a
				class="dashboard-hub-quicklink"
				class:dashboard-hub-quicklink--emphasis={link.emphasis}
				href={link.href}
			>
				<Icon size={18} />
				<div>
					<strong>{link.title}</strong>
					<p>{link.copy}</p>
				</div>
				<ArrowRight size={16} />
			</a>
		{/each}
	</div>
</article>
