import { and, count, desc, eq, sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { db } from './db';
import { user, account, team, teamMember, wrkspace, wrkspaceMember } from './db/schema';
import { error } from '@sveltejs/kit';

export async function hasAnyAdmin(): Promise<boolean> {
	const [row] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.role, 'admin'))
		.limit(1);
	return !!row;
}

export function requireAppAdmin(userRole: string | undefined): void {
	if (userRole !== 'admin') {
		error(403, 'Forbidden');
	}
}

export async function getUserRole(userId: string): Promise<string> {
	const [row] = await db
		.select({ role: user.role })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	return row?.role ?? 'user';
}

export async function isAppAdmin(userId: string): Promise<boolean> {
	return (await getUserRole(userId)) === 'admin';
}

export type AdminUserRow = {
	id: string;
	name: string;
	email: string;
	role: string;
	image: string | null;
	createdAt: Date;
	teamCount: number;
};

export async function listAllUsers(opts: {
	page?: number;
	limit?: number;
}): Promise<{ users: AdminUserRow[]; total: number }> {
	const page = Math.max(1, opts.page ?? 1);
	const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
	const offset = (page - 1) * limit;

	const [countRow] = await db.select({ value: count() }).from(user);
	const total = countRow?.value ?? 0;

	const rows = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			image: user.image,
			createdAt: user.createdAt,
			teamCount: sql<number>`(
				SELECT COUNT(*)::int FROM ${teamMember}
				WHERE ${teamMember.userId} = ${user.id}
			)`
		})
		.from(user)
		.orderBy(desc(user.createdAt))
		.limit(limit)
		.offset(offset);

	return { users: rows, total };
}

export type AdminTeamRow = {
	id: string;
	name: string;
	slug: string;
	createdAt: Date;
	memberCount: number;
	wrkspaceCount: number;
	ownerName: string | null;
	ownerEmail: string | null;
};

export async function listAllTeamsWithDetails(): Promise<AdminTeamRow[]> {
	const teamIdOuter = sql.raw('"team"."id"');
	const rows = await db
		.select({
			id: team.id,
			name: team.name,
			slug: team.slug,
			createdAt: team.createdAt,
			memberCount: sql<number>`(
				SELECT COUNT(*)::int FROM ${teamMember}
				WHERE ${teamMember.teamId} = ${teamIdOuter}
			)`,
			wrkspaceCount: sql<number>`(
				SELECT COUNT(*)::int FROM ${wrkspace}
				WHERE ${wrkspace.teamId} = ${teamIdOuter}
			)`,
			ownerName: sql<string | null>`(
				SELECT ${user.name} FROM ${teamMember}
				INNER JOIN ${user} ON ${user.id} = ${teamMember.userId}
				WHERE ${teamMember.teamId} = ${teamIdOuter} AND ${teamMember.role} = 'owner'
				LIMIT 1
			)`,
			ownerEmail: sql<string | null>`(
				SELECT ${user.email} FROM ${teamMember}
				INNER JOIN ${user} ON ${user.id} = ${teamMember.userId}
				WHERE ${teamMember.teamId} = ${teamIdOuter} AND ${teamMember.role} = 'owner'
				LIMIT 1
			)`
		})
		.from(team)
		.orderBy(desc(team.createdAt));

	return rows;
}

export type AdminWrkspaceRow = {
	id: string;
	name: string;
	slug: string;
	description: string;
	createdAt: Date;
	memberCount: number;
	createdByName: string | null;
};

export async function listAllWrkspacesForTeam(teamId: string): Promise<AdminWrkspaceRow[]> {
	const rows = await db
		.select({
			id: wrkspace.id,
			name: wrkspace.name,
			slug: wrkspace.slug,
			description: wrkspace.description,
			createdAt: wrkspace.createdAt,
			memberCount: sql<number>`(
				SELECT COUNT(*)::int FROM ${wrkspaceMember}
				WHERE ${wrkspaceMember.wrkspaceId} = ${wrkspace.id}
			)`,
			createdByName: sql<string | null>`(
				SELECT ${user.name} FROM ${user}
				WHERE ${user.id} = ${wrkspace.createdById}
				LIMIT 1
			)`
		})
		.from(wrkspace)
		.where(eq(wrkspace.teamId, teamId))
		.orderBy(desc(wrkspace.createdAt));

	return rows;
}

export async function resetUserPassword(userId: string): Promise<string> {
	const password = generateRandomPassword();
	const hashed = await hashPassword(password);

	await db
		.update(account)
		.set({ password: hashed })
		.where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));

	return password;
}

function generateRandomPassword(length = 16): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(bytes)
		.map((b) => chars[b % chars.length])
		.join('');
}

export async function adminDeleteTeam(teamId: string): Promise<void> {
	await db.delete(team).where(eq(team.id, teamId));
}

export async function adminDeleteWrkspace(wrkspaceId: string): Promise<void> {
	await db.delete(wrkspace).where(eq(wrkspace.id, wrkspaceId));
}

export async function promoteToAdmin(userId: string): Promise<void> {
	await db.update(user).set({ role: 'admin' }).where(eq(user.id, userId));
}

export async function getAdminStats(): Promise<{
	userCount: number;
	teamCount: number;
	wrkspaceCount: number;
}> {
	const [users] = await db.select({ value: count() }).from(user);
	const [teams] = await db.select({ value: count() }).from(team);
	const [wrkspaces] = await db.select({ value: count() }).from(wrkspace);

	return {
		userCount: users?.value ?? 0,
		teamCount: teams?.value ?? 0,
		wrkspaceCount: wrkspaces?.value ?? 0
	};
}

export async function getTeamById(teamId: string): Promise<{
	id: string;
	name: string;
	slug: string;
	createdAt: Date;
} | null> {
	const [row] = await db
		.select({
			id: team.id,
			name: team.name,
			slug: team.slug,
			createdAt: team.createdAt
		})
		.from(team)
		.where(eq(team.id, teamId))
		.limit(1);
	return row ?? null;
}
