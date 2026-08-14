<script>
	import body from '$lib/pages/partners.html?raw';
</script>

<svelte:head>
	<title>Find Partners · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/partners.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/sidebar.js" data-active="partners" defer></script>
	<script src="/pagejs/partners.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
