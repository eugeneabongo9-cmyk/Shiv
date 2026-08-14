<script lang="ts">
	import { BarChart3, BookOpen, LayoutDashboard, Webhook } from 'lucide-svelte';

	interface Props {
		pathname: string;
	}

	let { pathname }: Props = $props();

	const tabs = [
		{
			href: '/admin',
			label: 'Operations',
			icon: LayoutDashboard,
			match: (path: string) =>
				path === '/admin' ||
				(path.startsWith('/admin/') &&
					!path.startsWith('/admin/analytics') &&
					!path.startsWith('/admin/lessons') &&
					!path.startsWith('/admin/webhooks'))
		},
		{
			href: '/admin/analytics',
			label: 'Analytics',
			icon: BarChart3,
			match: (path: string) => path.startsWith('/admin/analytics')
		},
		{
			href: '/admin/lessons',
			label: 'Lessons',
			icon: BookOpen,
			match: (path: string) => path.startsWith('/admin/lessons')
		},
		{
			href: '/admin/webhooks',
			label: 'Webhooks',
			icon: Webhook,
			match: (path: string) => path.startsWith('/admin/webhooks')
		}
	] as const;
</script>

<nav class="adm-tabs" aria-label="Admin sections">
	{#each tabs as tab}
		<a
			href={tab.href}
			class="adm-tab"
			class:on={tab.match(pathname)}
			aria-current={tab.match(pathname) ? 'page' : undefined}
		>
			<tab.icon />
			{tab.label}
		</a>
	{/each}
</nav>
