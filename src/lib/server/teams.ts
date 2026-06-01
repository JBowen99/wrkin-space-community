import { and, eq } from 'drizzle-orm';
import { DEFAULT_SUBSCRIPTION_TIER, isSubscriptionTier, type SubscriptionTier } from '$lib/shared/pricing';
import { parseTeamRole, type TeamRole } from '$lib/shared/roles';
import { db } from './db';
import { team, teamMember } from './db/schema';
import {
	getTeamCapabilities,
	getTeamMembership,
	requireTeamCapabilityForUser
} from './authorization';
import { slugify, uniqueId } from '$lib/shared/slug';

export type Team = {
	id: string;
	name: string;
	slug: string;
	subscriptionTier: SubscriptionTier;
};

export type TeamWithRole = Team & {
	role: TeamRole;
	capabilities: ReturnType<typeof getTeamCapabilities>;
};

function parseSubscriptionTier(value: string): SubscriptionTier {
	return isSubscriptionTier(value) ? value : DEFAULT_SUBSCRIPTION_TIER;
}

export async function listTeamsForUser(userId: string): Promise<TeamWithRole[]> {
	const rows = await db
		.select({
			id: team.id,
			name: team.name,
			slug: team.slug,
			subscriptionTier: team.subscriptionTier,
			role: teamMember.role
		})
		.from(team)
		.innerJoin(teamMember, eq(teamMember.teamId, team.id))
		.where(eq(teamMember.userId, userId));

	return rows.map((row) => {
		const role = parseTeamRole(row.role);
		return {
			id: row.id,
			name: row.name,
			slug: row.slug,
			subscriptionTier: parseSubscriptionTier(row.subscriptionTier),
			role,
			capabilities: getTeamCapabilities(role)
		};
	});
}

export async function getTeamForUser(userId: string, teamSlug: string): Promise<Team | undefined> {
	const rows = await db
		.select({
			id: team.id,
			name: team.name,
			slug: team.slug,
			subscriptionTier: team.subscriptionTier
		})
		.from(team)
		.innerJoin(teamMember, eq(teamMember.teamId, team.id))
		.where(and(eq(teamMember.userId, userId), eq(team.slug, teamSlug)))
		.limit(1);

	const row = rows[0];
	if (!row) return undefined;

	return {
		...row,
		subscriptionTier: parseSubscriptionTier(row.subscriptionTier)
	};
}

export async function getTeamBySlug(teamSlug: string): Promise<Team | undefined> {
	const rows = await db
		.select({
			id: team.id,
			name: team.name,
			slug: team.slug,
			subscriptionTier: team.subscriptionTier
		})
		.from(team)
		.where(eq(team.slug, teamSlug))
		.limit(1);

	const row = rows[0];
	if (!row) return undefined;

	return {
		...row,
		subscriptionTier: parseSubscriptionTier(row.subscriptionTier)
	};
}

export async function userIsTeamMember(userId: string, teamId: string): Promise<boolean> {
	const rows = await db
		.select({ teamId: teamMember.teamId })
		.from(teamMember)
		.where(and(eq(teamMember.userId, userId), eq(teamMember.teamId, teamId)))
		.limit(1);

	return rows.length > 0;
}

export async function createTeamForUser(
	userId: string,
	data: { name: string; slug?: string }
): Promise<Team> {
	const baseSlug = slugify(data.slug ?? data.name) || `team-${Date.now()}`;
	let slug = baseSlug;
	let suffix = 1;

	while (await getTeamBySlug(slug)) {
		slug = `${baseSlug}-${suffix++}`;
	}

	const id = uniqueId();

	await db
		.insert(team)
		.values({ id, name: data.name, slug, subscriptionTier: DEFAULT_SUBSCRIPTION_TIER });
	await db.insert(teamMember).values({ teamId: id, userId, role: 'owner' });

	return { id, name: data.name, slug, subscriptionTier: DEFAULT_SUBSCRIPTION_TIER };
}

export async function updateTeamForUser(
	userId: string,
	teamSlug: string,
	data: { name?: string }
): Promise<boolean> {
	try {
		const membership = await requireTeamCapabilityForUser(userId, teamSlug, 'manage_team');
		if (!data.name?.trim()) return false;
		await db.update(team).set({ name: data.name.trim() }).where(eq(team.id, membership.teamId));
		return true;
	} catch {
		return false;
	}
}

export async function deleteTeamForUser(userId: string, teamSlug: string): Promise<boolean> {
	try {
		const membership = await requireTeamCapabilityForUser(userId, teamSlug, 'delete_team');
		await db.delete(team).where(eq(team.id, membership.teamId));
		return true;
	} catch {
		return false;
	}
}

export { getTeamMembership, getTeamCapabilities };

export async function ensurePersonalTeam(userId: string, userName: string): Promise<Team> {
	const existing = await listTeamsForUser(userId);
	if (existing[0]) {
		return existing[0];
	}

	return createTeamForUser(userId, {
		name: `${userName}'s Team`,
		slug: slugify(userName) || 'personal'
	});
}
