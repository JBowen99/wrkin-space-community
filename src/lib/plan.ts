import type { SubscriptionTier } from '$lib/shared/pricing';

/** Self-hosted community edition always runs at the highest tier limits. */
export const COMMUNITY_EFFECTIVE_TIER: SubscriptionTier = 'pro';

export function getCommunityEffectiveTier(_storedTier?: SubscriptionTier): SubscriptionTier {
	return COMMUNITY_EFFECTIVE_TIER;
}
