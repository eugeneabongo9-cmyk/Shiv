<script>
	import body from '$lib/pages/profile.html?raw';
</script>

<svelte:head>
	<title>Your Dossier · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/profile.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/sidebar.js" data-active="profile" defer></script>
	<script src="/pagejs/profile.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
