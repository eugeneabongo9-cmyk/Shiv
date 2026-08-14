<script>
	import body from '$lib/pages/admin.html?raw';
</script>

<svelte:head>
	<title>Admin Console · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/admin.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/catalog.js" defer></script>
	<script src="/assets/docs.js" defer></script>
	<script src="/assets/sidebar.js" data-active="admin" defer></script>
	<script src="/pagejs/admin.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
