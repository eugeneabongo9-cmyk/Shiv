<script>
	import body from '$lib/pages/community.html?raw';
</script>

<svelte:head>
	<title>Community · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/community.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/sidebar.js" data-active="community" defer></script>
	<script src="/pagejs/community.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
