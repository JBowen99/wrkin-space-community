import { and, eq } from 'drizzle-orm';
import type { WrkspaceRole } from '$lib/shared/roles';
import { isTeamAdminOrOwner, parseTeamRole, parseWrkspaceRole } from '$lib/shared/roles';
import { db } from './db';
import { teamMember, user, wrkspaceMember } from './db/schema';
import { getWrkspaceAccess, requireWrkspaceCapability } from './authorization';

export type WrkspaceMemberRow = {
	userId: string;
	name: string;
	email: string;
	image: string | null;
	role: WrkspaceRole;
	/** True when access comes from team owner/admin (no explicit row). */
	implicit: boolean;
	teamRole: ReturnType<typeof parseTeamRole> | null;
};

export async function listWrkspaceMembers(
	actorUserId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<WrkspaceMemberRow[] | null> {
	const access = await getWrkspaceAccess(actorUserId, teamSlug, wrkspaceSlug);
	if (!access) return null;

	requireWrkspaceCapability(access, 'manage_members');

	const explicit = await db
		.select({
			userId: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			role: wrkspaceMember.role,
			teamRole: teamMember.role
		})
		.from(wrkspaceMember)
		.innerJoin(user, eq(wrkspaceMember.userId, user.id))
		.innerJoin(teamMember, eq(teamMember.userId, user.id))
		.where(
			and(eq(wrkspaceMember.wrkspaceId, access.wrkspaceId), eq(teamMember.teamId, access.teamId))
		);

	const implicitAdmins = await db
		.select({
			userId: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			teamRole: teamMember.role
		})
		.from(teamMember)
		.innerJoin(user, eq(teamMember.userId, user.id))
		.where(eq(teamMember.teamId, access.teamId));

	const explicitIds = new Set(explicit.map((m) => m.userId));
	const result: WrkspaceMemberRow[] = explicit.map((m) => ({
		userId: m.userId,
		name: m.name,
		email: m.email,
		image: m.image,
		role: parseWrkspaceRole(m.role),
		implicit: false,
		teamRole: parseTeamRole(m.teamRole)
	}));

	for (const m of implicitAdmins) {
		if (explicitIds.has(m.userId)) continue;
		const teamRole = parseTeamRole(m.teamRole);
		if (!isTeamAdminOrOwner(teamRole)) continue;
		result.push({
			userId: m.userId,
			name: m.name,
			email: m.email,
			image: m.image,
			role: 'admin',
			implicit: true,
			teamRole
		});
	}

	return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addWrkspaceMember(
	actorUserId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	targetUserId: string,
	role: WrkspaceRole
): Promise<{ ok: true } | { ok: false; message: string }> {
	const access = await getWrkspaceAccess(actorUserId, teamSlug, wrkspaceSlug);
	if (!access) {
		return { ok: false, message: 'Wrkspace not found' };
	}

	try {
		requireWrkspaceCapability(access, 'manage_members');
	} catch {
		return { ok: false, message: 'Forbidden' };
	}

	const [onTeam] = await db
		.select({ userId: teamMember.userId })
		.from(teamMember)
		.where(and(eq(teamMember.teamId, access.teamId), eq(teamMember.userId, targetUserId)))
		.limit(1);

	if (!onTeam) {
		return { ok: false, message: 'User must be a team member first' };
	}

	if (isTeamAdminOrOwner(access.teamRole) && access.teamRole !== 'user') {
		// Team admins already have implicit access
		const [targetTeam] = await db
			.select({ role: teamMember.role })
			.from(teamMember)
			.where(and(eq(teamMember.teamId, access.teamId), eq(teamMember.userId, targetUserId)))
			.limit(1);
		if (targetTeam && isTeamAdminOrOwner(parseTeamRole(targetTeam.role))) {
			return { ok: false, message: 'Team admins already have access to all wrkspaces' };
		}
	}

	await db
		.insert(wrkspaceMember)
		.values({ wrkspaceId: access.wrkspaceId, userId: targetUserId, role })
		.onConflictDoUpdate({
			target: [wrkspaceMember.wrkspaceId, wrkspaceMember.userId],
			set: { role }
		});

	return { ok: true };
}

export async function updateWrkspaceMemberRole(
	actorUserId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	targetUserId: string,
	newRole: WrkspaceRole
): Promise<{ ok: true } | { ok: false; message: string }> {
	const access = await getWrkspaceAccess(actorUserId, teamSlug, wrkspaceSlug);
	if (!access) {
		return { ok: false, message: 'Wrkspace not found' };
	}

	try {
		requireWrkspaceCapability(access, 'manage_members');
	} catch {
		return { ok: false, message: 'Forbidden' };
	}

	const [existing] = await db
		.select({ role: wrkspaceMember.role })
		.from(wrkspaceMember)
		.where(
			and(eq(wrkspaceMember.wrkspaceId, access.wrkspaceId), eq(wrkspaceMember.userId, targetUserId))
		)
		.limit(1);

	if (!existing) {
		return { ok: false, message: 'Member not found on this wrkspace' };
	}

	if (parseWrkspaceRole(existing.role) === 'owner' && newRole !== 'owner') {
		const owners = await db
			.select({ role: wrkspaceMember.role })
			.from(wrkspaceMember)
			.where(eq(wrkspaceMember.wrkspaceId, access.wrkspaceId));

		const ownerCount = owners.filter((o) => parseWrkspaceRole(o.role) === 'owner').length;
		if (ownerCount <= 1) {
			return { ok: false, message: 'Assign another owner before changing this role' };
		}
	}

	await db
		.update(wrkspaceMember)
		.set({ role: newRole })
		.where(
			and(eq(wrkspaceMember.wrkspaceId, access.wrkspaceId), eq(wrkspaceMember.userId, targetUserId))
		);

	return { ok: true };
}

export async function removeWrkspaceMember(
	actorUserId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	targetUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
	const access = await getWrkspaceAccess(actorUserId, teamSlug, wrkspaceSlug);
	if (!access) {
		return { ok: false, message: 'Wrkspace not found' };
	}

	try {
		requireWrkspaceCapability(access, 'manage_members');
	} catch {
		return { ok: false, message: 'Forbidden' };
	}

	const [existing] = await db
		.select({ role: wrkspaceMember.role })
		.from(wrkspaceMember)
		.where(
			and(eq(wrkspaceMember.wrkspaceId, access.wrkspaceId), eq(wrkspaceMember.userId, targetUserId))
		)
		.limit(1);

	if (!existing) {
		return { ok: false, message: 'Member not found on this wrkspace' };
	}

	if (parseWrkspaceRole(existing.role) === 'owner') {
		const owners = await db
			.select({ role: wrkspaceMember.role })
			.from(wrkspaceMember)
			.where(eq(wrkspaceMember.wrkspaceId, access.wrkspaceId));

		const ownerCount = owners.filter((o) => parseWrkspaceRole(o.role) === 'owner').length;
		if (ownerCount <= 1) {
			return { ok: false, message: 'Assign another owner before removing this member' };
		}
	}

	await db
		.delete(wrkspaceMember)
		.where(
			and(eq(wrkspaceMember.wrkspaceId, access.wrkspaceId), eq(wrkspaceMember.userId, targetUserId))
		);

	return { ok: true };
}

export async function listTeamMembersForWrkspacePicker(teamId: string) {
	return db
		.select({
			userId: user.id,
			name: user.name,
			email: user.email,
			role: teamMember.role
		})
		.from(teamMember)
		.innerJoin(user, eq(teamMember.userId, user.id))
		.where(eq(teamMember.teamId, teamId));
}
