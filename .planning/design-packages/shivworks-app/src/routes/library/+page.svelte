<script>
	import body from '$lib/pages/library.html?raw';
</script>

<svelte:head>
	<title>Library · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/library.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/catalog.js" defer></script>
	<script src="/assets/sidebar.js" data-active="library" defer></script>
	<script src="/pagejs/library.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
