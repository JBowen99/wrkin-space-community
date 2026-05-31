/** Team and wrkspace member roles — stored as text in the database. */
export const TEAM_ROLES = ['owner', 'admin', 'user'] as const;
export const WRKSPACE_ROLES = ['owner', 'admin', 'user'] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];
export type WrkspaceRole = (typeof WRKSPACE_ROLES)[number];

const LEGACY_MEMBER = 'member';

export function parseTeamRole(value: string): TeamRole {
	if (value === LEGACY_MEMBER) return 'user';
	if ((TEAM_ROLES as readonly string[]).includes(value)) {
		return value as TeamRole;
	}
	return 'user';
}

export function parseWrkspaceRole(value: string): WrkspaceRole {
	if ((WRKSPACE_ROLES as readonly string[]).includes(value)) {
		return value as WrkspaceRole;
	}
	return 'user';
}

export function isTeamAdminOrOwner(role: TeamRole): boolean {
	return role === 'owner' || role === 'admin';
}

export function isWrkspaceAdminOrOwner(role: WrkspaceRole): boolean {
	return role === 'owner' || role === 'admin';
}

/** Effective wrkspace role rank for comparison (higher = more privilege). */
export function wrkspaceRoleRank(role: WrkspaceRole): number {
	switch (role) {
		case 'owner':
			return 3;
		case 'admin':
			return 2;
		case 'user':
			return 1;
	}
}
