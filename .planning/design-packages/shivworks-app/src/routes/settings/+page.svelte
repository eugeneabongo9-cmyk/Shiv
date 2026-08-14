<script>
	import body from '$lib/pages/settings.html?raw';
</script>

<svelte:head>
	<title>Settings · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/settings.css" />
	<script src="/assets/sidebar.js" data-active="settings" defer></script>
	<script src="/pagejs/settings.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
