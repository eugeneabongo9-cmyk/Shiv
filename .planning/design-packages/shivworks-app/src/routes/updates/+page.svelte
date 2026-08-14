<script>
	import body from '$lib/pages/updates.html?raw';
</script>

<svelte:head>
	<title>Updates · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/updates.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/sidebar.js" data-active="updates" defer></script>
	<script src="/pagejs/updates.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
