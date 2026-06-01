import { getSubscriptionTierLabel, type SubscriptionTier } from './pricing';
import { getModuleTierMin, type ModuleType } from './modules';

export type PlanLimitKind = 'members' | 'wrkspaces' | 'modules' | 'upload_bytes' | 'module_gated';

export type PlanLimits = {
	maxMembers: number;
	maxWrkspaces: number | null;
	maxModulesPerWrkspace: number | null;
	maxUploadBytes: number;
	allowsInvites: boolean;
};

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
	personal: {
		maxMembers: 1,
		maxWrkspaces: 1,
		maxModulesPerWrkspace: 3,
		maxUploadBytes: 5 * 1024 * 1024,
		allowsInvites: false
	},
	plus: {
		maxMembers: 5,
		maxWrkspaces: 3,
		maxModulesPerWrkspace: null,
		maxUploadBytes: 25 * 1024 * 1024,
		allowsInvites: true
	},
	pro: {
		maxMembers: 10,
		maxWrkspaces: null,
		maxModulesPerWrkspace: null,
		maxUploadBytes: 100 * 1024 * 1024,
		allowsInvites: true
	}
};

export type PlanLimitErrorCode =
	| 'PLAN_LIMIT_MEMBERS'
	| 'PLAN_LIMIT_WRKSPACES'
	| 'PLAN_LIMIT_MODULES'
	| 'PLAN_LIMIT_UPLOAD'
	| 'PLAN_INVITES_DISABLED'
	| 'PLAN_MODULE_GATED';

/** Client-safe info shape passed to UI from a PlanLimitError. */
export type PlanLimitInfo = {
	code: PlanLimitErrorCode;
	message: string;
	tier: SubscriptionTier;
	/** Cheapest tier that resolves the limit, or null if no upgrade helps. */
	upgradeTier: SubscriptionTier | null;
};

const TIER_RANK: Record<SubscriptionTier, number> = {
	personal: 0,
	plus: 1,
	pro: 2
};

/** Cheapest tier that resolves the failure, given the current tier. Null if upgrades won't help. */
export function suggestUpgradeTier(
	code: PlanLimitErrorCode,
	currentTier: SubscriptionTier,
	requiredTier?: SubscriptionTier
): SubscriptionTier | null {
	if (code === 'PLAN_MODULE_GATED' && requiredTier) {
		return TIER_RANK[requiredTier] > TIER_RANK[currentTier] ? requiredTier : null;
	}

	if (currentTier === 'personal') return 'plus';
	if (currentTier === 'plus') return 'pro';
	return null;
}

/** Throws when a module type is reserved for a higher tier than the team currently has. */
export function assertModuleTypeAllowed(tier: SubscriptionTier, type: ModuleType): void {
	const required = getModuleTierMin(type);
	if (TIER_RANK[required] > TIER_RANK[tier]) {
		throw new PlanLimitError(
			'PLAN_MODULE_GATED',
			'module_gated',
			tier,
			TIER_RANK[required],
			`This module is available on ${getSubscriptionTierLabel(required)} and above`
		);
	}
}

export class PlanLimitError extends Error {
	readonly code: PlanLimitErrorCode;
	readonly kind: PlanLimitKind;
	readonly tier: SubscriptionTier;
	readonly limit: number;

	constructor(
		code: PlanLimitErrorCode,
		kind: PlanLimitKind,
		tier: SubscriptionTier,
		limit: number,
		message?: string
	) {
		super(message ?? code);
		this.name = 'PlanLimitError';
		this.code = code;
		this.kind = kind;
		this.tier = tier;
		this.limit = limit;
	}
}

export function getPlanLimits(tier: SubscriptionTier): PlanLimits {
	return PLAN_LIMITS[tier];
}

export function formatUploadLimit(bytes: number): string {
	if (bytes >= 1024 * 1024) {
		return `${bytes / (1024 * 1024)} MB`;
	}
	return `${bytes / 1024} KB`;
}
