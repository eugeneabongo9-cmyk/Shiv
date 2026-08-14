<script>
	import body from '$lib/pages/messages.html?raw';
</script>

<svelte:head>
	<title>Messages · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/messages.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/docs.js" defer></script>
	<script src="/assets/sidebar.js" data-active="messages" defer></script>
	<script src="/pagejs/messages.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
