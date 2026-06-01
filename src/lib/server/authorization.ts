import { error } from '@sveltejs/kit';
import { and, count, eq, inArray } from 'drizzle-orm';
import { DEFAULT_SUBSCRIPTION_TIER, isSubscriptionTier, type SubscriptionTier } from '$lib/shared/pricing';
import {
	getPlanLimits,
	PlanLimitError,
	suggestUpgradeTier,
	type PlanLimitInfo,
	type PlanLimitKind,
	type PlanLimitErrorCode
} from '$lib/shared/plan-limits';
import {
	isTeamAdminOrOwner,
	isWrkspaceAdminOrOwner,
	parseTeamRole,
	parseWrkspaceRole,
	type TeamRole,
	type WrkspaceRole
} from '$lib/shared/roles';
import { db } from './db';
import {
	chatMessage,
	docPage,
	forumPost,
	forumThread,
	taskItem,
	team,
	teamMember,
	wrkspace,
	wrkspaceMember,
	wrkspaceModule
} from './db/schema';

export type TeamMembership = {
	teamId: string;
	teamSlug: string;
	teamName: string;
	subscriptionTier: SubscriptionTier;
	extraMemberSeats: number;
	role: TeamRole;
};

export type WrkspaceAccess = {
	wrkspaceId: string;
	wrkspaceSlug: string;
	wrkspaceName: string;
	teamId: string;
	teamSlug: string;
	teamRole: TeamRole;
	/** Explicit wrkspace membership role, if any. */
	wrkspaceRole: WrkspaceRole | null;
	/** Role used for capability checks (implicit admin for team owner/admin). */
	effectiveWrkspaceRole: WrkspaceRole;
	hasExplicitMembership: boolean;
};

export type TeamCapability =
	| 'view_team'
	| 'manage_team'
	| 'manage_members'
	| 'create_wrkspace'
	| 'delete_team';

export type WrkspaceCapability =
	| 'view_wrkspace'
	| 'manage_settings'
	| 'manage_members'
	| 'manage_modules'
	| 'delete_wrkspace';

export type TeamCapabilities = Record<TeamCapability, boolean>;
export type WrkspaceCapabilities = Record<WrkspaceCapability, boolean>;

function parseTier(value: string): SubscriptionTier {
	return isSubscriptionTier(value) ? value : DEFAULT_SUBSCRIPTION_TIER;
}

function teamCapabilitiesForRole(role: TeamRole): TeamCapabilities {
	return {
		view_team: true,
		manage_team: role === 'owner' || role === 'admin',
		manage_members: role === 'owner' || role === 'admin',
		create_wrkspace: role === 'owner' || role === 'admin',
		delete_team: role === 'owner'
	};
}

function wrkspaceCapabilitiesForRole(role: WrkspaceRole): WrkspaceCapabilities {
	return {
		view_wrkspace: true,
		manage_settings: isWrkspaceAdminOrOwner(role),
		manage_members: isWrkspaceAdminOrOwner(role),
		manage_modules: isWrkspaceAdminOrOwner(role),
		delete_wrkspace: role === 'owner'
	};
}

export function getTeamCapabilities(role: TeamRole): TeamCapabilities {
	return teamCapabilitiesForRole(role);
}

export function getWrkspaceCapabilities(effectiveRole: WrkspaceRole): WrkspaceCapabilities {
	return wrkspaceCapabilitiesForRole(effectiveRole);
}

export async function getTeamMembership(
	userId: string,
	teamSlug: string
): Promise<TeamMembership | null> {
	const rows = await db
		.select({
			teamId: team.id,
			teamSlug: team.slug,
			teamName: team.name,
			subscriptionTier: team.subscriptionTier,
			extraMemberSeats: team.extraMemberSeats,
			role: teamMember.role
		})
		.from(team)
		.innerJoin(teamMember, eq(teamMember.teamId, team.id))
		.where(and(eq(teamMember.userId, userId), eq(team.slug, teamSlug)))
		.limit(1);

	const row = rows[0];
	if (!row) return null;

	return {
		teamId: row.teamId,
		teamSlug: row.teamSlug,
		teamName: row.teamName,
		subscriptionTier: parseTier(row.subscriptionTier),
		extraMemberSeats: row.extraMemberSeats,
		role: parseTeamRole(row.role)
	};
}

function effectiveWrkspaceRole(
	teamRole: TeamRole,
	explicitRole: WrkspaceRole | null
): WrkspaceRole | null {
	if (isTeamAdminOrOwner(teamRole)) {
		return 'admin';
	}
	return explicitRole;
}

export async function getWrkspaceAccess(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<WrkspaceAccess | null> {
	const membership = await getTeamMembership(userId, teamSlug);
	if (!membership) return null;

	const wrkspaceRows = await db
		.select({
			wrkspaceId: wrkspace.id,
			wrkspaceSlug: wrkspace.slug,
			wrkspaceName: wrkspace.name
		})
		.from(wrkspace)
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(and(eq(team.slug, teamSlug), eq(wrkspace.slug, wrkspaceSlug)))
		.limit(1);

	const ws = wrkspaceRows[0];
	if (!ws) return null;

	const memberRows = await db
		.select({ role: wrkspaceMember.role })
		.from(wrkspaceMember)
		.where(and(eq(wrkspaceMember.wrkspaceId, ws.wrkspaceId), eq(wrkspaceMember.userId, userId)))
		.limit(1);

	const explicitRole = memberRows[0] ? parseWrkspaceRole(memberRows[0].role) : null;
	const effective = effectiveWrkspaceRole(membership.role, explicitRole);
	if (!effective) return null;

	return {
		wrkspaceId: ws.wrkspaceId,
		wrkspaceSlug: ws.wrkspaceSlug,
		wrkspaceName: ws.wrkspaceName,
		teamId: membership.teamId,
		teamSlug: membership.teamSlug,
		teamRole: membership.role,
		wrkspaceRole: explicitRole,
		effectiveWrkspaceRole: effective,
		hasExplicitMembership: explicitRole !== null
	};
}

export async function userCanAccessWrkspace(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<boolean> {
	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	return access !== null;
}

export async function assertWrkspaceAccess(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<WrkspaceAccess> {
	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) {
		error(403, 'Forbidden');
	}
	return access;
}

export async function listAccessibleWrkspaceSlugs(
	userId: string,
	teamSlug: string
): Promise<
	{
		id: string;
		name: string;
		description: string;
		slug: string;
		capabilities: WrkspaceCapabilities;
	}[]
> {
	const membership = await getTeamMembership(userId, teamSlug);
	if (!membership) return [];

	if (isTeamAdminOrOwner(membership.role)) {
		const rows = await db
			.select({
				id: wrkspace.id,
				name: wrkspace.name,
				description: wrkspace.description,
				slug: wrkspace.slug
			})
			.from(wrkspace)
			.innerJoin(team, eq(wrkspace.teamId, team.id))
			.where(eq(team.slug, teamSlug));
		const caps = getWrkspaceCapabilities('admin');
		return rows.map((r) => ({ ...r, capabilities: caps }));
	}

	const rows = await db
		.select({
			id: wrkspace.id,
			name: wrkspace.name,
			description: wrkspace.description,
			slug: wrkspace.slug,
			role: wrkspaceMember.role
		})
		.from(wrkspace)
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.innerJoin(wrkspaceMember, eq(wrkspaceMember.wrkspaceId, wrkspace.id))
		.where(and(eq(team.slug, teamSlug), eq(wrkspaceMember.userId, userId)));

	return rows.map(({ role, ...rest }) => ({
		...rest,
		capabilities: getWrkspaceCapabilities(parseWrkspaceRole(role))
	}));
}

export function requireTeamCapability(
	membership: TeamMembership,
	capability: TeamCapability
): void {
	const caps = getTeamCapabilities(membership.role);
	if (!caps[capability]) {
		error(403, 'Forbidden');
	}
}

export function requireWrkspaceCapability(
	access: WrkspaceAccess,
	capability: WrkspaceCapability
): void {
	const caps = getWrkspaceCapabilities(access.effectiveWrkspaceRole);
	if (!caps[capability]) {
		error(403, 'Forbidden');
	}
}

export async function requireTeamCapabilityForUser(
	userId: string,
	teamSlug: string,
	capability: TeamCapability
): Promise<TeamMembership> {
	const membership = await getTeamMembership(userId, teamSlug);
	if (!membership) {
		error(403, 'Forbidden');
	}
	requireTeamCapability(membership, capability);
	return membership;
}

export async function requireWrkspaceCapabilityForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	capability: WrkspaceCapability
): Promise<WrkspaceAccess> {
	const access = await assertWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	requireWrkspaceCapability(access, capability);
	return access;
}

export async function countTeamMembers(teamId: string): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(teamMember)
		.where(eq(teamMember.teamId, teamId));
	return row?.value ?? 0;
}

export async function countTeamWrkspaces(teamId: string): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(wrkspace)
		.where(eq(wrkspace.teamId, teamId));
	return row?.value ?? 0;
}

export async function countWrkspaceModules(wrkspaceId: string): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(wrkspaceModule)
		.where(eq(wrkspaceModule.wrkspaceId, wrkspaceId));
	return row?.value ?? 0;
}

export function maxMembersForTeam(tier: SubscriptionTier, extraMemberSeats: number): number {
	const limits = getPlanLimits(tier);
	return limits.maxMembers + extraMemberSeats;
}




export async function assertWithinPlanLimits(
	teamId: string,
	tier: SubscriptionTier,
	extraMemberSeats: number,
	kind: PlanLimitKind,
	delta = 1
): Promise<void> {
	const limits = getPlanLimits(tier);

	if (kind === 'members') {
		if (!limits.allowsInvites && delta > 0) {
			throw new PlanLimitError(
				'PLAN_INVITES_DISABLED',
				kind,
				tier,
				limits.maxMembers,
				'Upgrade to Plus to invite team members'
			);
		}
		const current = await countTeamMembers(teamId);
		const max = maxMembersForTeam(tier, extraMemberSeats);
		if (current + delta > max) {
			throw new PlanLimitError(
				'PLAN_LIMIT_MEMBERS',
				kind,
				tier,
				max,
				`Member limit reached (${max})`
			);
		}
		return;
	}

	if (kind === 'wrkspaces') {
		if (limits.maxWrkspaces === null) return;
		const current = await countTeamWrkspaces(teamId);
		if (current + delta > limits.maxWrkspaces) {
			throw new PlanLimitError(
				'PLAN_LIMIT_WRKSPACES',
				kind,
				tier,
				limits.maxWrkspaces,
				`Wrkspace limit reached (${limits.maxWrkspaces})`
			);
		}
		return;
	}

	if (kind === 'modules') {
		if (limits.maxModulesPerWrkspace === null) return;
		throw new PlanLimitError(
			'PLAN_LIMIT_MODULES',
			kind,
			tier,
			limits.maxModulesPerWrkspace,
			'Module limit is checked per wrkspace'
		);
	}
}

export async function assertWrkspaceModuleLimit(
	wrkspaceId: string,
	tier: SubscriptionTier,
	delta = 1
): Promise<void> {
	const limits = getPlanLimits(tier);
	if (limits.maxModulesPerWrkspace === null) return;

	const current = await countWrkspaceModules(wrkspaceId);
	if (current + delta > limits.maxModulesPerWrkspace) {
		throw new PlanLimitError(
			'PLAN_LIMIT_MODULES',
			'modules',
			tier,
			limits.maxModulesPerWrkspace,
			`Module limit reached (${limits.maxModulesPerWrkspace} per wrkspace)`
		);
	}
}

export function assertUploadWithinPlan(tier: SubscriptionTier, sizeBytes: number): void {
	const limits = getPlanLimits(tier);
	if (sizeBytes > limits.maxUploadBytes) {
		throw new PlanLimitError(
			'PLAN_LIMIT_UPLOAD',
			'upload_bytes',
			tier,
			limits.maxUploadBytes,
			`File exceeds upload limit (${formatBytes(limits.maxUploadBytes)})`
		);
	}
}

function formatBytes(bytes: number): string {
	if (bytes >= 1024 * 1024) return `${bytes / (1024 * 1024)} MB`;
	return `${bytes / 1024} KB`;
}

export function planLimitFailMessage(err: PlanLimitError): string {
	return err.message;
}

export function planLimitErrorCode(err: unknown): PlanLimitErrorCode | null {
	if (err instanceof PlanLimitError) return err.code;
	return null;
}

/** Build the client-safe info object from a PlanLimitError. */
export function planLimitToInfo(
	err: PlanLimitError,
	requiredTier?: SubscriptionTier
): PlanLimitInfo {
	return {
		code: err.code,
		message: err.message,
		tier: err.tier,
		upgradeTier: suggestUpgradeTier(err.code, err.tier, requiredTier)
	};
}

/** Resolve team tier from wrkspace id (for upload APIs). */
export async function getSubscriptionTierForWrkspaceId(
	wrkspaceId: string
): Promise<SubscriptionTier | null> {
	const rows = await db
		.select({ tier: team.subscriptionTier })
		.from(wrkspace)
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(wrkspace.id, wrkspaceId))
		.limit(1);
	const row = rows[0];
	return row ? parseTier(row.tier) : null;
}

export async function userCanAccessDocById(userId: string, docId: string): Promise<boolean> {
	const rows = await db
		.select({
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug
		})
		.from(docPage)
		.innerJoin(wrkspaceModule, eq(docPage.moduleId, wrkspaceModule.id))
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(docPage.id, docId))
		.limit(1);

	const row = rows[0];
	if (!row) return false;
	return userCanAccessWrkspace(userId, row.teamSlug, row.wrkspaceSlug);
}

export async function userCanAccessModuleById(userId: string, moduleId: string): Promise<boolean> {
	const rows = await db
		.select({
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug
		})
		.from(wrkspaceModule)
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(wrkspaceModule.id, moduleId))
		.limit(1);

	const row = rows[0];
	if (!row) return false;
	return userCanAccessWrkspace(userId, row.teamSlug, row.wrkspaceSlug);
}

export async function userCanAccessTaskById(userId: string, taskId: string): Promise<boolean> {
	const rows = await db
		.select({
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug
		})
		.from(taskItem)
		.innerJoin(wrkspaceModule, eq(taskItem.moduleId, wrkspaceModule.id))
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(taskItem.id, taskId))
		.limit(1);

	const row = rows[0];
	if (!row) return false;
	return userCanAccessWrkspace(userId, row.teamSlug, row.wrkspaceSlug);
}

export async function userCanAccessChatMessageById(
	userId: string,
	messageId: string
): Promise<boolean> {
	const rows = await db
		.select({
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug
		})
		.from(chatMessage)
		.innerJoin(wrkspaceModule, eq(chatMessage.moduleId, wrkspaceModule.id))
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(chatMessage.id, messageId))
		.limit(1);

	const row = rows[0];
	if (!row) return false;
	return userCanAccessWrkspace(userId, row.teamSlug, row.wrkspaceSlug);
}

export async function userCanAccessForumPostById(userId: string, postId: string): Promise<boolean> {
	const rows = await db
		.select({
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug
		})
		.from(forumPost)
		.innerJoin(forumThread, eq(forumPost.threadId, forumThread.id))
		.innerJoin(wrkspaceModule, eq(forumThread.moduleId, wrkspaceModule.id))
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(forumPost.id, postId))
		.limit(1);

	const row = rows[0];
	if (!row) return false;
	return userCanAccessWrkspace(userId, row.teamSlug, row.wrkspaceSlug);
}

export async function removeUserFromTeamWrkspaces(teamId: string, userId: string): Promise<void> {
	const wsIds = await db
		.select({ id: wrkspace.id })
		.from(wrkspace)
		.where(eq(wrkspace.teamId, teamId));

	if (wsIds.length === 0) return;

	await db.delete(wrkspaceMember).where(
		and(
			eq(wrkspaceMember.userId, userId),
			inArray(
				wrkspaceMember.wrkspaceId,
				wsIds.map((w) => w.id)
			)
		)
	);
}
