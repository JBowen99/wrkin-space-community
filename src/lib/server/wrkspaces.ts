import { and, eq } from 'drizzle-orm';
import { PlanLimitError, type PlanLimitInfo } from '../shared/plan-limits';
import { db } from './db/index.ts';
import { wrkspace, wrkspaceMember } from './db/schema.ts';
import {
	assertWithinPlanLimits,
	assertWrkspaceAccess,
	getTeamMembership,
	getWrkspaceAccess,
	listAccessibleWrkspaceSlugs,
	planLimitFailMessage,
	planLimitToInfo,
	requireTeamCapabilityForUser,
	requireWrkspaceCapabilityForUser,
	type WrkspaceCapabilities
} from './authorization.ts';
import { slugify, uniqueId } from '../shared/slug';

export type Wrkspace = {
	id: string;
	teamId: string;
	name: string;
	description: string;
	slug: string;
	teamSlug: string;
};

export async function listWrkspacesForTeam(
	userId: string,
	teamSlug: string
): Promise<
	(Pick<Wrkspace, 'id' | 'name' | 'description' | 'slug'> & {
		capabilities: WrkspaceCapabilities;
	})[]
> {
	const membership = await getTeamMembership(userId, teamSlug);
	if (!membership) return [];
	return listAccessibleWrkspaceSlugs(userId, teamSlug);
}

export async function getWrkspaceForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<Wrkspace | undefined> {
	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;

	return {
		id: access.wrkspaceId,
		teamId: access.teamId,
		name: access.wrkspaceName,
		description: '',
		slug: access.wrkspaceSlug,
		teamSlug: access.teamSlug
	};
}

export async function getWrkspaceWithDescription(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<Wrkspace | undefined> {
	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;

	const [row] = await db
		.select({
			id: wrkspace.id,
			teamId: wrkspace.teamId,
			name: wrkspace.name,
			description: wrkspace.description,
			slug: wrkspace.slug
		})
		.from(wrkspace)
		.where(eq(wrkspace.id, access.wrkspaceId))
		.limit(1);

	if (!row) return undefined;
	return { ...row, teamSlug: access.teamSlug };
}

export type CreateWrkspaceFailure = { error: string; planLimit?: PlanLimitInfo };

export async function createWrkspaceForTeam(
	userId: string,
	teamSlug: string,
	data: { name: string; description?: string; slug?: string; id?: string }
): Promise<Wrkspace | CreateWrkspaceFailure> {
	let membership;
	try {
		membership = await requireTeamCapabilityForUser(userId, teamSlug, 'create_wrkspace');
	} catch {
		return { error: 'Forbidden' };
	}

	try {
		await assertWithinPlanLimits(
			membership.teamId,
			membership.subscriptionTier,
			membership.extraMemberSeats,
			'wrkspaces',
			1
		);
	} catch (err) {
		if (err instanceof PlanLimitError) {
			return { error: planLimitFailMessage(err), planLimit: planLimitToInfo(err) };
		}
		throw err;
	}

	const baseSlug = slugify(data.slug ?? data.name) || `wrkspace-${Date.now()}`;
	let slug = baseSlug;
	let suffix = 1;

	while (
		await db
			.select({ id: wrkspace.id })
			.from(wrkspace)
			.where(and(eq(wrkspace.teamId, membership.teamId), eq(wrkspace.slug, slug)))
			.limit(1)
			.then((r) => r[0])
	) {
		slug = `${baseSlug}-${suffix++}`;
	}

	const id = data.id ?? uniqueId();

	const [created] = await db
		.insert(wrkspace)
		.values({
			id,
			teamId: membership.teamId,
			name: data.name,
			description: data.description ?? '',
			slug,
			createdById: userId
		})
		.returning({
			id: wrkspace.id,
			teamId: wrkspace.teamId,
			name: wrkspace.name,
			description: wrkspace.description,
			slug: wrkspace.slug
		});

	await db.insert(wrkspaceMember).values({
		wrkspaceId: id,
		userId,
		role: 'owner'
	});

	return { ...created, teamSlug: membership.teamSlug };
}

export async function updateWrkspaceForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	data: { name?: string; description?: string }
): Promise<boolean> {
	const access = await requireWrkspaceCapabilityForUser(
		userId,
		teamSlug,
		wrkspaceSlug,
		'manage_settings'
	);

	const updates: Partial<{ name: string; description: string }> = {};
	if (data.name?.trim()) updates.name = data.name.trim();
	if (data.description !== undefined) updates.description = data.description;

	if (Object.keys(updates).length === 0) return false;

	await db.update(wrkspace).set(updates).where(eq(wrkspace.id, access.wrkspaceId));
	return true;
}

export async function deleteWrkspaceForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<boolean> {
	try {
		const access = await requireWrkspaceCapabilityForUser(
			userId,
			teamSlug,
			wrkspaceSlug,
			'delete_wrkspace'
		);
		await db.delete(wrkspace).where(eq(wrkspace.id, access.wrkspaceId));
		return true;
	} catch {
		return false;
	}
}

export { assertWrkspaceAccess, getWrkspaceAccess };
