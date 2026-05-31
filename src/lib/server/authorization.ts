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
