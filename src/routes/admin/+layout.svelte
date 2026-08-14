<script lang="ts">
	import { page } from '$app/stores';
	import AdminNav from '$lib/components/admin/AdminNav.svelte';
	import AdminStats from '$lib/components/admin/AdminStats.svelte';
	import { Shield } from 'lucide-svelte';
	import type { LayoutData } from './$types';

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();
</script>

<main class="adm">
	<div class="container stack-column">
		<div class="adm-head">
			<div class="adm-head-copy">
				<span class="adm-badge"><Shield /> Staff console</span>
				<h1>Admin</h1>
			</div>
		</div>

		<AdminNav pathname={$page.url.pathname} />
		<AdminStats summary={data.adminSummary} />

		{@render children()}
	</div>
</main>
