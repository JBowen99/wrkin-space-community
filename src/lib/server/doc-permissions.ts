import { and, eq } from 'drizzle-orm';
import { db } from './db/index.ts';
import { docFolder, docFolderGrant } from './db/schema.ts';
import type { WrkspaceAccess } from './authorization.ts';
import { getWrkspaceCapabilities } from './authorization.ts';
import type { DocsFolderGrantLevel } from '../shared/docs-library';

export type FolderPermission = 'view' | 'edit' | 'none';

export type FolderGrantRow = {
	folderId: string;
	userId: string;
	level: DocsFolderGrantLevel;
};

export type FolderMeta = {
	id: string;
	parentId: string | null;
	ownerUserId: string | null;
};

export async function loadFolderGrantsForModule(moduleId: string): Promise<FolderGrantRow[]> {
	const rows = await db
		.select({
			folderId: docFolderGrant.folderId,
			userId: docFolderGrant.userId,
			level: docFolderGrant.level
		})
		.from(docFolderGrant)
		.innerJoin(docFolder, eq(docFolderGrant.folderId, docFolder.id))
		.where(eq(docFolder.moduleId, moduleId));

	return rows.map((r) => ({
		folderId: r.folderId,
		userId: r.userId,
		level: r.level === 'edit' ? 'edit' : 'view'
	}));
}

export async function loadFoldersForModule(moduleId: string): Promise<FolderMeta[]> {
	return db
		.select({
			id: docFolder.id,
			parentId: docFolder.parentId,
			ownerUserId: docFolder.ownerUserId
		})
		.from(docFolder)
		.where(eq(docFolder.moduleId, moduleId));
}

function buildParentMap(folders: FolderMeta[]): Map<string, string | null> {
	const map = new Map<string, string | null>();
	for (const f of folders) {
		map.set(f.id, f.parentId);
	}
	return map;
}

function buildOwnerMap(folders: FolderMeta[]): Map<string, string | null> {
	const map = new Map<string, string | null>();
	for (const f of folders) {
		map.set(f.id, f.ownerUserId);
	}
	return map;
}

export function getFolderOwner(
	folderId: string,
	owners: Map<string, string | null>
): string | null {
	return owners.get(folderId) ?? null;
}

/** Folder id and ancestors, starting at the folder itself then walking up. */
function ancestorIds(folderId: string | null, parentMap: Map<string, string | null>): string[] {
	const ids: string[] = [];
	let current = folderId;
	while (current) {
		ids.push(current);
		current = parentMap.get(current) ?? null;
	}
	return ids;
}

export function grantsForFolder(folderId: string, grants: FolderGrantRow[]): FolderGrantRow[] {
	return grants.filter((g) => g.folderId === folderId);
}

/** True when the folder has an explicit member list (not open to whole wrkspace). */
export function isFolderRestricted(folderId: string, grants: FolderGrantRow[]): boolean {
	return grantsForFolder(folderId, grants).length > 0;
}

function userPassesRestrictedAncestors(
	userId: string,
	folderId: string | null,
	grants: FolderGrantRow[],
	parentMap: Map<string, string | null>
): boolean {
	if (!folderId) return true;

	for (const id of ancestorIds(folderId, parentMap)) {
		if (!isFolderRestricted(id, grants)) continue;
		const grant = grants.find((g) => g.folderId === id && g.userId === userId);
		if (!grant) return false;
	}

	return true;
}

/**
 * Module root (null folder) is always open to all wrkspace members.
 * A folder with no grant rows is open (view + edit) for anyone who can reach it.
 * A folder with grant rows is closed: only listed members and the folder owner may access.
 * The owner always has view + edit on their folder (without a grant row).
 */
export function effectiveFolderPermission(
	userId: string,
	folderId: string | null,
	access: WrkspaceAccess | null,
	manageModules: boolean,
	grants: FolderGrantRow[],
	parentMap: Map<string, string | null>,
	owners: Map<string, string | null>
): FolderPermission {
	if (!access) return 'none';
	if (manageModules) return 'edit';
	if (!folderId) return 'edit';

	if (!userPassesRestrictedAncestors(userId, folderId, grants, parentMap)) {
		return 'none';
	}

	const ownerId = getFolderOwner(folderId, owners);
	if (ownerId === userId) {
		return 'edit';
	}

	if (!isFolderRestricted(folderId, grants)) {
		return 'edit';
	}

	const grant = grants.find((g) => g.folderId === folderId && g.userId === userId);
	if (!grant) return 'none';
	return grant.level === 'edit' ? 'edit' : 'view';
}

export async function getDocsPermissionContext(
	userId: string,
	moduleId: string,
	access: WrkspaceAccess | null
): Promise<{
	grants: FolderGrantRow[];
	parentMap: Map<string, string | null>;
	owners: Map<string, string | null>;
	manageModules: boolean;
}> {
	const caps = access ? getWrkspaceCapabilities(access.effectiveWrkspaceRole) : null;
	const [grants, folders] = await Promise.all([
		loadFolderGrantsForModule(moduleId),
		loadFoldersForModule(moduleId)
	]);

	return {
		grants,
		parentMap: buildParentMap(folders),
		owners: buildOwnerMap(folders),
		manageModules: caps?.manage_modules ?? false
	};
}

export function canViewFolder(
	userId: string,
	folderId: string | null,
	access: WrkspaceAccess | null,
	ctx: {
		grants: FolderGrantRow[];
		parentMap: Map<string, string | null>;
		owners: Map<string, string | null>;
		manageModules: boolean;
	}
): boolean {
	return (
		effectiveFolderPermission(
			userId,
			folderId,
			access,
			ctx.manageModules,
			ctx.grants,
			ctx.parentMap,
			ctx.owners
		) !== 'none'
	);
}

export function canEditFolder(
	userId: string,
	folderId: string | null,
	access: WrkspaceAccess | null,
	ctx: {
		grants: FolderGrantRow[];
		parentMap: Map<string, string | null>;
		owners: Map<string, string | null>;
		manageModules: boolean;
	}
): boolean {
	return (
		effectiveFolderPermission(
			userId,
			folderId,
			access,
			ctx.manageModules,
			ctx.grants,
			ctx.parentMap,
			ctx.owners
		) === 'edit'
	);
}

/** Only the folder owner (or wrkspace module managers) may change sharing and ownership. */
export function canManageFolderSharing(
	userId: string,
	folderId: string,
	ctx: {
		owners: Map<string, string | null>;
		manageModules: boolean;
	}
): boolean {
	if (ctx.manageModules) return true;
	return getFolderOwner(folderId, ctx.owners) === userId;
}
