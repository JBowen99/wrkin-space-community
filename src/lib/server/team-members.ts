import { and, eq } from 'drizzle-orm';
import type { TeamRole } from '../shared/roles';
import { parseTeamRole } from '../shared/roles';
import { db } from './db/index.ts';
import { teamMember, user } from './db/schema.ts';
import {
	assertWithinPlanLimits,
	getTeamMembership,
	removeUserFromTeamWrkspaces,
	requireTeamCapability
} from './authorization.ts';
import type { SubscriptionTier } from '../shared/pricing';

export type TeamMemberRow = {
	userId: string;
	name: string;
	email: string;
	image: string | null;
	role: TeamRole;
	createdAt: Date;
};

export async function listTeamMembers(teamId: string): Promise<TeamMemberRow[]> {
	const rows = await db
		.select({
			userId: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			role: teamMember.role,
			createdAt: teamMember.createdAt
		})
		.from(teamMember)
		.innerJoin(user, eq(teamMember.userId, user.id))
		.where(eq(teamMember.teamId, teamId));

	return rows.map((row) => ({
		...row,
		role: parseTeamRole(row.role)
	}));
}

export async function countTeamOwners(teamId: string): Promise<number> {
	const rows = await db
		.select({ role: teamMember.role })
		.from(teamMember)
		.where(eq(teamMember.teamId, teamId));

	return rows.filter((r) => parseTeamRole(r.role) === 'owner').length;
}

export async function updateTeamMemberRole(
	actorUserId: string,
	teamSlug: string,
	targetUserId: string,
	newRole: TeamRole
): Promise<{ ok: true } | { ok: false; message: string }> {
	const membership = await getTeamMembership(actorUserId, teamSlug);
	if (!membership) {
		return { ok: false, message: 'Team not found' };
	}

	try {
		requireTeamCapability(membership, 'manage_members');
	} catch {
		return { ok: false, message: 'Forbidden' };
	}

	if (newRole === 'owner' && membership.role !== 'owner') {
		return { ok: false, message: 'Only the team owner can assign the owner role' };
	}

	const [target] = await db
		.select({ role: teamMember.role })
		.from(teamMember)
		.where(and(eq(teamMember.teamId, membership.teamId), eq(teamMember.userId, targetUserId)))
		.limit(1);

	if (!target) {
		return { ok: false, message: 'Member not found' };
	}

	const currentRole = parseTeamRole(target.role);

	if (currentRole === 'owner' && newRole !== 'owner') {
		const owners = await countTeamOwners(membership.teamId);
		if (owners <= 1) {
			return { ok: false, message: 'Transfer ownership before removing the last owner' };
		}
	}

	await db
		.update(teamMember)
		.set({ role: newRole })
		.where(and(eq(teamMember.teamId, membership.teamId), eq(teamMember.userId, targetUserId)));

	return { ok: true };
}

export async function removeTeamMember(
	actorUserId: string,
	teamSlug: string,
	targetUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
	const membership = await getTeamMembership(actorUserId, teamSlug);
	if (!membership) {
		return { ok: false, message: 'Team not found' };
	}

	try {
		requireTeamCapability(membership, 'manage_members');
	} catch {
		return { ok: false, message: 'Forbidden' };
	}

	const [target] = await db
		.select({ role: teamMember.role })
		.from(teamMember)
		.where(and(eq(teamMember.teamId, membership.teamId), eq(teamMember.userId, targetUserId)))
		.limit(1);

	if (!target) {
		return { ok: false, message: 'Member not found' };
	}

	if (parseTeamRole(target.role) === 'owner') {
		const owners = await countTeamOwners(membership.teamId);
		if (owners <= 1) {
			return { ok: false, message: 'Transfer ownership before removing the last owner' };
		}
	}

	await removeUserFromTeamWrkspaces(membership.teamId, targetUserId);
	await db
		.delete(teamMember)
		.where(and(eq(teamMember.teamId, membership.teamId), eq(teamMember.userId, targetUserId)));

	return { ok: true };
}

export async function transferTeamOwnership(
	actorUserId: string,
	teamSlug: string,
	newOwnerUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
	const membership = await getTeamMembership(actorUserId, teamSlug);
	if (!membership || membership.role !== 'owner') {
		return { ok: false, message: 'Only the team owner can transfer ownership' };
	}

	if (actorUserId === newOwnerUserId) {
		return { ok: false, message: 'Already the owner' };
	}

	const [target] = await db
		.select({ userId: teamMember.userId })
		.from(teamMember)
		.where(and(eq(teamMember.teamId, membership.teamId), eq(teamMember.userId, newOwnerUserId)))
		.limit(1);

	if (!target) {
		return { ok: false, message: 'Member not found' };
	}

	await db
		.update(teamMember)
		.set({ role: 'admin' })
		.where(and(eq(teamMember.teamId, membership.teamId), eq(teamMember.userId, actorUserId)));

	await db
		.update(teamMember)
		.set({ role: 'owner' })
		.where(and(eq(teamMember.teamId, membership.teamId), eq(teamMember.userId, newOwnerUserId)));

	return { ok: true };
}

export async function addTeamMemberDirect(
	teamId: string,
	userId: string,
	role: TeamRole,
	tier: SubscriptionTier,
	extraMemberSeats: number
): Promise<void> {
	await assertWithinPlanLimits(teamId, tier, extraMemberSeats, 'members', 1);
	await db.insert(teamMember).values({ teamId, userId, role });
}
