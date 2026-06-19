/** Seed users — stable emails/passwords printed by `pnpm db:seed`. */
export const SEED_USERS = [
	{
		key: 'test',
		email: 'test@wrkin.local',
		password: 'password123',
		name: 'Test User',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-test'
	},
	{
		key: 'alex',
		email: 'alex@wrkin.local',
		password: 'password123',
		name: 'Alex Morgan',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-alex'
	},
	{
		key: 'jordan',
		email: 'jordan@wrkin.local',
		password: 'password123',
		name: 'Jordan Lee',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-jordan'
	},
	{
		key: 'sam',
		email: 'sam@wrkin.local',
		password: 'password123',
		name: 'Sam Patel',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-sam'
	},
	{
		key: 'taylor',
		email: 'taylor@wrkin.local',
		password: 'password123',
		name: 'Taylor Brooks',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-taylor'
	},
	{
		key: 'morgan',
		email: 'morgan@wrkin.local',
		password: 'password123',
		name: 'Morgan Chen',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-morgan'
	},
	{
		key: 'riley',
		email: 'riley@wrkin.local',
		password: 'password123',
		name: 'Riley Kim',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-riley'
	},
	{
		key: 'casey',
		email: 'casey@wrkin.local',
		password: 'password123',
		name: 'Casey Rivera',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-casey'
	},
	{
		key: 'jamie',
		email: 'jamie@wrkin.local',
		password: 'password123',
		name: 'Jamie Ortiz',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-jamie'
	},
	{
		key: 'quinn',
		email: 'quinn@wrkin.local',
		password: 'password123',
		name: 'Quinn Walsh',
		image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-quinn'
	}
] as const;

export type SeedUserKey = (typeof SEED_USERS)[number]['key'];

export const SEED_TEAMS = [
	{ id: 'seed-team-acme', name: 'Acme Labs', slug: 'acme-labs' },
	{ id: 'seed-team-northwind', name: 'Northwind Studio', slug: 'northwind' },
	{ id: 'seed-team-bridge', name: 'Bridge Collective', slug: 'bridge' }
] as const;

/** Five members per team; several users belong to multiple teams. */
export const SEED_TEAM_MEMBERSHIPS = [
	{ teamId: 'seed-team-acme', userKey: 'test', role: 'owner' as const },
	{ teamId: 'seed-team-acme', userKey: 'alex', role: 'user' as const },
	{ teamId: 'seed-team-acme', userKey: 'jordan', role: 'user' as const },
	{ teamId: 'seed-team-acme', userKey: 'sam', role: 'user' as const },
	{ teamId: 'seed-team-acme', userKey: 'taylor', role: 'user' as const },
	{ teamId: 'seed-team-northwind', userKey: 'alex', role: 'owner' as const },
	{ teamId: 'seed-team-northwind', userKey: 'jordan', role: 'user' as const },
	{ teamId: 'seed-team-northwind', userKey: 'morgan', role: 'user' as const },
	{ teamId: 'seed-team-northwind', userKey: 'riley', role: 'user' as const },
	{ teamId: 'seed-team-northwind', userKey: 'casey', role: 'user' as const },
	{ teamId: 'seed-team-bridge', userKey: 'jordan', role: 'owner' as const },
	{ teamId: 'seed-team-bridge', userKey: 'test', role: 'user' as const },
	{ teamId: 'seed-team-bridge', userKey: 'casey', role: 'user' as const },
	{ teamId: 'seed-team-bridge', userKey: 'jamie', role: 'user' as const },
	{ teamId: 'seed-team-bridge', userKey: 'quinn', role: 'user' as const }
] as const;

export type SeedWrkspaceDepth = 'simple' | 'medium' | 'showcase' | 'light';

export const SEED_WRKSPACES = [
	{
		id: 'acme-simple',
		teamId: 'seed-team-acme',
		name: 'Pilot project',
		slug: 'pilot',
		description: 'Minimal modules for quick demos',
		depth: 'simple' as const
	},
	{
		id: 'acme-medium',
		teamId: 'seed-team-acme',
		name: 'Product beta',
		slug: 'product-beta',
		description: 'Several modules with realistic sample content',
		depth: 'medium' as const
	},
	{
		id: 'platform-alpha',
		teamId: 'seed-team-acme',
		name: 'Platform Alpha',
		slug: 'platform-alpha',
		description: 'Full showcase — every enabled module type',
		depth: 'showcase' as const
	},
	{
		id: 'nw-client-alpha',
		teamId: 'seed-team-northwind',
		name: 'Client Alpha',
		slug: 'client-alpha',
		description: 'Client delivery wrkspace',
		depth: 'light' as const
	},
	{
		id: 'nw-client-beta',
		teamId: 'seed-team-northwind',
		name: 'Client Beta',
		slug: 'client-beta',
		description: 'Second client engagement',
		depth: 'light' as const
	},
	{
		id: 'nw-internal',
		teamId: 'seed-team-northwind',
		name: 'Internal ops',
		slug: 'internal-ops',
		description: 'Studio operations and tooling',
		depth: 'light' as const
	},
	{
		id: 'bridge-research',
		teamId: 'seed-team-bridge',
		name: 'Research sandbox',
		slug: 'research',
		description: 'Experiments and spikes',
		depth: 'light' as const
	},
	{
		id: 'bridge-partner',
		teamId: 'seed-team-bridge',
		name: 'Partner onboarding',
		slug: 'partner-onboarding',
		description: 'Shared space with partner teams',
		depth: 'light' as const
	},
	{
		id: 'bridge-archive',
		teamId: 'seed-team-bridge',
		name: 'Archive',
		slug: 'archive',
		description: 'Completed initiatives',
		depth: 'light' as const
	}
] as const;

/** Primary demo team — used by legacy `/projects/*` redirects. */
export const SEED_TEAM = SEED_TEAMS[0];

/** @deprecated Use SEED_USERS — kept for existing imports. */
export const SEED_USER = SEED_USERS[0];

/** @deprecated Use SEED_USERS — kept for existing imports. */
export const SEED_USER_2 = SEED_USERS[1];

export const DEPRECATED_SEED_TEAM_IDS = ['seed-personal'] as const;

/**
 * Wrkspace IDs retired from the seed config. Deleted on reset if they still exist
 * outside current seed teams (e.g. after a schema migration).
 */
export const DEPRECATED_SEED_WRKSPACE_IDS = ['design-system'] as const;

/** Everything `pnpm db:seed` owns — wiped before each run (dev only). */
export const SEED_OWNED = {
	teamIds: [...SEED_TEAMS.map((t) => t.id), ...DEPRECATED_SEED_TEAM_IDS],
	wrkspaceIds: [...SEED_WRKSPACES.map((w) => w.id), ...DEPRECATED_SEED_WRKSPACE_IDS],
	userEmails: SEED_USERS.map((u) => u.email)
} as const;

export function seedTeamSlugForWrkspace(wrkspaceId: string): string {
	const wrkspace = SEED_WRKSPACES.find((w) => w.id === wrkspaceId);
	if (!wrkspace) return SEED_TEAM.slug;
	const team = SEED_TEAMS.find((t) => t.id === wrkspace.teamId);
	return team?.slug ?? SEED_TEAM.slug;
}

export function seedWrkspaceSlug(wrkspaceId: string): string {
	return SEED_WRKSPACES.find((w) => w.id === wrkspaceId)?.slug ?? wrkspaceId;
}
