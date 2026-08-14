<script>
	import body from '$lib/pages/live.html?raw';
</script>

<svelte:head>
	<title>Live · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/live.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/sidebar.js" data-active="live" defer></script>
	<script src="/pagejs/live.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
