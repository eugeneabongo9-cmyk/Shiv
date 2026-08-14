<script>
	import body from '$lib/pages/leaderboard.html?raw';
</script>

<svelte:head>
	<title>Leaderboard · ShivWorks Network</title>
	<link rel="stylesheet" href="/pagecss/leaderboard.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
	<script src="/assets/sidebar.js" data-active="leaderboard" defer></script>
	<script src="/pagejs/leaderboard.js" defer></script>
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
