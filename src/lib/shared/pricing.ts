/** Subscription tiers — aligned with landing page pricing (Personal, Plus, Pro). */
export const SUBSCRIPTION_TIERS = ['personal', 'plus', 'pro'] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const DEFAULT_SUBSCRIPTION_TIER: SubscriptionTier = 'personal';

export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
	personal: 'Personal',
	plus: 'Plus',
	pro: 'Pro'
};

export function isSubscriptionTier(value: string): value is SubscriptionTier {
	return (SUBSCRIPTION_TIERS as readonly string[]).includes(value);
}

export function getSubscriptionTierLabel(tier: SubscriptionTier): string {
	return SUBSCRIPTION_TIER_LABELS[tier];
}

/** Tailwind classes for tier chips on team lists. */
export const SUBSCRIPTION_TIER_CHIP_CLASS: Record<SubscriptionTier, string> = {
	personal: 'bg-stone-100 text-ink-muted',
	plus: 'bg-accent-muted/50 text-accent',
	pro: 'bg-ink/8 text-ink'
};
