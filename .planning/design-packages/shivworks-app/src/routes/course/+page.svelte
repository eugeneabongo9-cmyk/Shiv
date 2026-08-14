<script>
	import body from '$lib/pages/course.html?raw';
</script>

<svelte:head>
	<title>Managing Unknown Contacts · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/course.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/sidebar.js" data-active="library" defer></script>
	<script src="/pagejs/course.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
