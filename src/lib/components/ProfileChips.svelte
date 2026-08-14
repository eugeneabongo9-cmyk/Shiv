<script lang="ts">
	import type { MemberProfileRecord } from '$lib/server/db/shivworks';

	interface Props {
		profile: Pick<
			MemberProfileRecord,
			'locationCity' | 'locationState' | 'background' | 'ecqcAlumni' | 'mucAlumni' | 'ewoAlumni'
		> | null;
		size?: 'sm' | 'md';
	}

	let { profile, size = 'md' }: Props = $props();

	const location = $derived.by(() => {
		if (!profile) return null;
		const city = profile.locationCity?.trim() ?? '';
		const state = profile.locationState?.trim() ?? '';
		const parts = [city, state].filter(Boolean);
		return parts.length ? parts.join(', ') : null;
	});

	const backgroundChips = $derived.by(() => {
		if (!profile) return [] as string[];
		const out: string[] = [];
		if (profile.background.lawEnforcement) out.push('LE');
		if (profile.background.military) out.push('Military');
		if (profile.background.medical) out.push('Medical');
		if (profile.background.civilian) out.push('Civilian');
		if (profile.background.other) out.push('Other');
		return out;
	});

	const isEmpty = $derived(
		!location &&
			backgroundChips.length === 0 &&
			!profile?.ecqcAlumni &&
			!profile?.mucAlumni &&
			!profile?.ewoAlumni
	);
</script>

{#if !isEmpty}
	<ul class="profile-chips" class:profile-chips--sm={size === 'sm'} aria-label="Member background">
		{#if location}
			<li class="chip chip--location">{location}</li>
		{/if}
		{#each backgroundChips as label}
			<li class="chip chip--background">{label}</li>
		{/each}
		{#if profile?.ecqcAlumni}
			<li class="chip chip--alumni">ECQC Alumni</li>
		{/if}
		{#if profile?.mucAlumni}
			<li class="chip chip--alumni">MUC Alumni</li>
		{/if}
		{#if profile?.ewoAlumni}
			<li class="chip chip--alumni">EWO Alumni</li>
		{/if}
	</ul>
{/if}

<style>
	.profile-chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.55rem;
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 600;
		line-height: 1.4;
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: var(--color-fg-secondary, #a3a3a3);
		background: rgba(255, 255, 255, 0.03);
	}

	.profile-chips--sm .chip {
		font-size: 0.62rem;
		padding: 0.15rem 0.45rem;
	}

	.chip--location {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.06);
	}

	.chip--background {
		color: #ffffff;
		border-color: rgba(255, 255, 255, 0.18);
	}

	.chip--alumni {
		color: #ffffff;
		background: rgba(188, 19, 19, 0.18);
		border-color: rgba(188, 19, 19, 0.5);
	}
</style>
