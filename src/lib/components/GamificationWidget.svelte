<script lang="ts">
	import { Flame, Star, Trophy } from 'lucide-svelte';

	interface GamificationData {
		rank: string | null;
		trainingPoints: number;
		streakDays: number;
	}

	interface Props {
		data: GamificationData;
	}

	let { data }: Props = $props();

	const rankLabel = $derived(data.rank ?? 'Recruit');
	const streakLabel = $derived(
		data.streakDays === 0
			? 'No active streak'
			: data.streakDays === 1
				? '1 day streak'
				: `${data.streakDays} day streak`
	);
</script>

<article class="panel gamification-widget">
	<div class="gamification-header">
		<p class="eyebrow">Training status</p>
		<h3>Member standing</h3>
	</div>

	<div class="gamification-stats">
		<div class="gamification-stat">
			<Trophy size={18} />
			<div>
				<span>Rank</span>
				<strong>{rankLabel}</strong>
			</div>
		</div>

		<div class="gamification-stat">
			<Star size={18} />
			<div>
				<span>Training points</span>
				<strong>{data.trainingPoints.toLocaleString()} TP</strong>
			</div>
		</div>

		<div class="gamification-stat">
			<Flame size={18} />
			<div>
				<span>Streak</span>
				<strong>{streakLabel}</strong>
			</div>
		</div>
	</div>

	{#if data.trainingPoints === 0 && data.streakDays === 0}
		<p class="gamification-hint">
			Points and streaks accumulate as you complete modules and attend live sessions.
		</p>
	{/if}
</article>

<style>
	.gamification-widget {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.gamification-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.gamification-stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.gamification-stat {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.gamification-stat div {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.gamification-stat span {
		font-size: var(--text-xs);
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.gamification-stat strong {
		font-size: var(--text-base);
		font-weight: 600;
	}

	.gamification-hint {
		font-size: var(--text-sm);
		color: var(--color-muted);
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-3);
		margin: 0;
	}
</style>
