<script>
	import body from '$lib/pages/dashboard.html?raw';
</script>

<svelte:head>
	<title>Dashboard · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/dashboard.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/sidebar.js" data-active="dashboard" defer></script>
	<script src="/pagejs/dashboard.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
