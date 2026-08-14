<script lang="ts">
	import { MEMBERSHIP_TIERS, type MembershipTier } from '$lib/constants/tiers';

	interface Props {
		tier: MembershipTier | null;
	}

	let { tier }: Props = $props();
	const label = $derived(tier ? MEMBERSHIP_TIERS[tier].badge : 'Pending');
</script>

<span
	class="membership-badge"
	class:free={tier === 'free'}
	class:vip={tier === 'vip'}
	class:bronze={tier === 'bronze'}
>
	{label}
</span>
