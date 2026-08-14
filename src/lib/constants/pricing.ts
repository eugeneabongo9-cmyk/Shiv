export interface FoundingTier {
	id: string;
	label: string;
	price: number;
	spotCapCumulative: number;
	description: string;
	soldOut?: boolean;
}

export const FOUNDING_BRONZE_TIERS: FoundingTier[] = [
	{
		id: 'tier1',
		label: 'Tier 1',
		price: 199,
		spotCapCumulative: 250,
		description: 'Early supporter pricing',
		soldOut: true
	},
	{
		id: 'tier2',
		label: 'Tier 2',
		price: 249,
		spotCapCumulative: 1000,
		description: 'Founding member pricing'
	},
	{
		id: 'tier3',
		label: 'Tier 3',
		price: 299,
		spotCapCumulative: 1300,
		description: 'Founding member pricing'
	},
	{
		id: 'tier4',
		label: 'Tier 4',
		price: 399,
		spotCapCumulative: 1600,
		description: 'Founding member pricing'
	}
];

export const VIP_TIER = {
	id: 'vip',
	label: 'VIP Founding Member',
	price: 599,
	totalSpots: 200,
	description: 'All Bronze access plus direct call access to Craig'
};

export const TOTAL_BRONZE_SPOTS = 1600;

export interface ActiveTierInfo {
	tier: FoundingTier;
	spotsRemaining: number;
	isSoldOut: boolean;
}

export function getActiveBronzeTier(bronzeCount: number): ActiveTierInfo | null {
	for (const tier of FOUNDING_BRONZE_TIERS) {
		if (tier.soldOut) continue;
		if (bronzeCount < tier.spotCapCumulative) {
			return {
				tier,
				spotsRemaining: tier.spotCapCumulative - bronzeCount,
				isSoldOut: false
			};
		}
	}
	return null;
}
