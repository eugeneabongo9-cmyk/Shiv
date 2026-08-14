<script lang="ts">
	import { Filter, MapPin } from 'lucide-svelte';
	import type { PageData } from './$types';
	import SendMessageButton from '$lib/components/SendMessageButton.svelte';

	interface Props {
		data: PageData;
	}
	let { data }: Props = $props();

	function bgChips(bg: {
		civilian: boolean;
		lawEnforcement: boolean;
		military: boolean;
		medical: boolean;
		other: boolean;
	}): string[] {
		const out: string[] = [];
		if (bg.lawEnforcement) out.push('Law Enforcement');
		if (bg.military) out.push('Military');
		if (bg.medical) out.push('Medical');
		if (bg.civilian) out.push('Civilian');
		if (bg.other) out.push('Other');
		return out;
	}

	const bgsSelected = $derived(new Set<string>(data.filters.backgrounds));
</script>

<svelte:head><title>Find Training Partners · ShivWorks Network</title></svelte:head>

<main class="live">
	<div class="container">
		<div class="fp">
			<div class="fp-head section-heading" style="margin-bottom:0;max-width:none;">
				<p class="eyebrow">Network</p>
				<h1>Find Partners</h1>
				<p class="lede">
					Members who opted into the partner finder. Filter by location, background, and alumni
					status. Your card appears here only while "Show me in the partner finder" is on in your
					Training Profile.
				</p>
			</div>

			{#if !data.viewer.hasLocation}
				<div class="status-message upgrade-banner" style="margin-top:1.5rem;">
					<strong>Add your location.</strong>
					<span>Update your training profile to find local partners.</span>
					<a class="ghost-link" href="/account">Update training profile</a>
				</div>
			{/if}

			<div class="fp-layout">
				<aside class="fp-filters">
					<h2><Filter size={18} /> Filters</h2>

					<form method="GET">
						<div class="fp-fgroup">
							<p class="fl">Location</p>
							<div class="fp-field">
								<MapPin size={16} aria-hidden="true" />
								<input
									name="state"
									type="text"
									maxlength="2"
									placeholder="State (TX)"
									value={data.filters.state ?? ''}
								/>
							</div>
							<label class="field" style="margin-top:0.65rem;">
								<span>City contains</span>
								<input
									name="city"
									type="text"
									placeholder="Austin"
									value={data.filters.cityQuery ?? ''}
								/>
							</label>
							<label class="field" style="margin-top:0.65rem;">
								<span>Training goal contains</span>
								<input
									name="goal"
									type="text"
									placeholder="defensive carry"
									value={data.filters.goalQuery ?? ''}
								/>
							</label>
						</div>

						<div class="fp-fgroup">
							<p class="fl">Background</p>
							{#each [['civilian', 'Civilian'], ['le', 'Law Enforcement'], ['military', 'Military'], ['medical', 'Medical'], ['other', 'Other']] as [val, label]}
								<label class="fp-opt">
									<input type="checkbox" name="bg" value={val} checked={bgsSelected.has(val)} />
									<span>{label}</span>
								</label>
							{/each}
						</div>

						<div class="fp-fgroup">
							<p class="fl">Alumni</p>
							<label class="fp-opt">
								<input type="checkbox" name="ecqc" value="1" checked={data.filters.ecqcOnly} />
								<span>ECQC alumni only</span>
							</label>
						</div>

						<div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:1rem;">
							<button type="submit" class="btn btn-primary">Apply filters</button>
							<a class="btn btn-secondary fp-clear" href="/find-partners">Clear filters</a>
						</div>
					</form>
				</aside>

				<section>
					<div class="fp-resbar">
						<p class="fp-count">
							<b>{data.results.length}</b> member{data.results.length === 1 ? '' : 's'} found
						</p>
					</div>

					{#if data.results.length === 0}
						<p class="upd-empty">No members match those filters.</p>
					{:else}
						<div class="fp-grid">
							{#each data.results as r}
								<article class="panel fp-card">
									<a href={`/profile/${r.member.clerkUserId}`} class="fp-name">{r.member.name}</a>
									{#if r.profile.locationCity || r.profile.locationState}
										<p class="fp-loc">
											{[r.profile.locationCity, r.profile.locationState].filter(Boolean).join(', ')}
										</p>
									{/if}
									<div class="chips">
										{#each bgChips(r.profile.background) as chip}
											<span class="tag">{chip}</span>
										{/each}
										{#if r.profile.ecqcAlumni}<span class="tag accent">ECQC</span>{/if}
										{#if r.profile.mucAlumni}<span class="tag accent">MUC</span>{/if}
										{#if r.profile.ewoAlumni}<span class="tag accent">EWO</span>{/if}
									</div>
									{#if r.profile.trainingGoal}
										<p class="fp-goal">{r.profile.trainingGoal}</p>
									{/if}
									<div style="display:flex;gap:0.5rem;margin-top:auto;flex-wrap:wrap;">
										<SendMessageButton
											recipientClerkUserId={r.member.clerkUserId}
											variant="primary"
										/>
										<a class="ghost-link" href={`/profile/${r.member.clerkUserId}`}>View dossier</a>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</div>
		</div>
	</div>
</main>
