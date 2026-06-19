import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	isNull,
	or,
	type AnyColumn,
	type SQL
} from 'drizzle-orm';
import { db } from './db/index.ts';
import {
	docAsset,
	docFolder,
	docFolderGrant,
	docPage,
	user,
	wrkspaceMember,
	wrkspaceModule
} from './db/schema.ts';
import { getModuleContext, recordActivity } from './activity.ts';
import { getWrkspaceAccess } from './authorization.ts';
import { getSubscriptionTierForWrkspaceId } from './authorization.ts';
import { escapeIlike } from './ilike.ts';
import { fetchLinkPreview, parsePreviewUrl } from './link-preview.ts';
import { getModuleForUser } from './modules.ts';
import {
	canEditFolder,
	canManageFolderSharing,
	canViewFolder,
	getDocsPermissionContext,
	isFolderRestricted,
	loadFolderGrantsForModule,
	type FolderGrantRow
} from './doc-permissions.ts';
import { parseDocFolderColor } from '../shared/doc-folder-colors';
import { uniqueId } from '../shared/slug';
import { formatUploadLimit, getPlanLimits } from '../shared/plan-limits';
import { DEFAULT_SUBSCRIPTION_TIER } from '../shared/pricing';
import {
	DOCS_LIBRARY_PER_PAGE,
	parseDocsLibrarySort,
	type DocsFolderGrantLevel,
	type DocsLibraryAssetRow,
	type DocsLibraryBreadcrumb,
	type DocsLibraryDocRow,
	type DocsLibraryFolderRow,
	type DocsLibraryItemType,
	type DocsLibraryListItem,
	type DocsLibraryPage,
	type DocsLibrarySort,
	type DocsMoveFolderEntry,
	type DocsMoveFolderTree
} from '../shared/docs-library';
import { extractDocAssetTextPreview } from './doc-asset-preview.ts';
import { deleteObject, docsAssetKey, getObject, putObject } from './storage/index.ts';

const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp',
	'application/pdf': '.pdf',
	'text/plain': '.txt',
	'application/msword': '.doc',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
	'application/vnd.ms-excel': '.xls',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
	'application/vnd.ms-powerpoint': '.ppt',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx'
};

export type DocsFolderGrantInput = {
	userId: string;
	level: DocsFolderGrantLevel;
};

export type DocsLibraryMember = {
	userId: string;
	name: string;
	image: string | null;
};

async function assertDocsModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<boolean> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	return mod?.type === 'docs';
}

function folderParentCondition(folderId: string | null | undefined): SQL {
	if (folderId) return eq(docFolder.parentId, folderId);
	return isNull(docFolder.parentId);
}

function itemFolderCondition(
	column: { folderId: AnyColumn },
	folderId: string | null | undefined
): SQL {
	if (folderId) return eq(column.folderId, folderId);
	return isNull(column.folderId);
}

async function resolveFolderInModule(
	moduleId: string,
	folderId: string | null | undefined
): Promise<boolean> {
	if (!folderId) return true;
	const [row] = await db
		.select({ id: docFolder.id })
		.from(docFolder)
		.where(and(eq(docFolder.id, folderId), eq(docFolder.moduleId, moduleId)))
		.limit(1);
	return !!row;
}

async function buildBreadcrumbs(
	moduleId: string,
	folderId: string | null
): Promise<DocsLibraryBreadcrumb[]> {
	const crumbs: DocsLibraryBreadcrumb[] = [{ id: null, name: 'Library' }];
	if (!folderId) return crumbs;

	const folders = await db
		.select({ id: docFolder.id, parentId: docFolder.parentId, name: docFolder.name })
		.from(docFolder)
		.where(eq(docFolder.moduleId, moduleId));

	const byId = new Map(folders.map((f) => [f.id, f]));
	const chain: { id: string; name: string }[] = [];
	let current: string | null = folderId;
	while (current) {
		const f = byId.get(current);
		if (!f) break;
		chain.unshift({ id: f.id, name: f.name });
		current = f.parentId;
	}
	for (const c of chain) {
		crumbs.push({ id: c.id, name: c.name });
	}
	return crumbs;
}

function librarySearchWhere(
	q: string,
	opts: {
		folderName?: AnyColumn;
		docTitle?: AnyColumn;
		docPreview?: AnyColumn;
		assetTitle?: AnyColumn;
		assetUrl?: AnyColumn;
	}
): SQL | undefined {
	if (!q.trim()) return undefined;
	const pattern = `%${escapeIlike(q.trim())}%`;
	const parts: SQL[] = [];
	if (opts.folderName) parts.push(ilike(opts.folderName, pattern));
	if (opts.docTitle) parts.push(ilike(opts.docTitle, pattern));
	if (opts.docPreview) parts.push(ilike(opts.docPreview, pattern));
	if (opts.assetTitle) parts.push(ilike(opts.assetTitle, pattern));
	if (opts.assetUrl) parts.push(ilike(opts.assetUrl, pattern));
	if (parts.length === 0) return undefined;
	return or(...parts);
}

type UnifiedItem =
	| {
			kind: 'folder';
			row: DocsLibraryFolderRow;
			sortName: string;
			sortUpdated: Date;
			sortCreated: Date;
	  }
	| { kind: 'doc'; row: DocsLibraryDocRow; sortName: string; sortUpdated: Date; sortCreated: Date }
	| {
			kind: 'asset';
			row: DocsLibraryAssetRow;
			sortName: string;
			sortUpdated: Date;
			sortCreated: Date;
	  };

function compareUnifiedItems(a: UnifiedItem, b: UnifiedItem, sort: DocsLibrarySort): number {
	if (sort === 'type') {
		const order = { folder: 0, doc: 1, asset: 2 };
		const diff = order[a.kind] - order[b.kind];
		if (diff !== 0) return diff;
		return a.sortName.localeCompare(b.sortName);
	}
	if (sort === 'name') {
		return a.sortName.localeCompare(b.sortName, undefined, { sensitivity: 'base' });
	}
	if (sort === 'created') return a.sortCreated.getTime() - b.sortCreated.getTime();
	return b.sortUpdated.getTime() - a.sortUpdated.getTime();
}

/** Folders always lead the grid; docs and assets follow, each group sorted by the active sort. */
function sortUnified(items: UnifiedItem[], sort: DocsLibrarySort): UnifiedItem[] {
	const folders = items.filter((item) => item.kind === 'folder');
	const other = items.filter((item) => item.kind !== 'folder');
	folders.sort((a, b) => compareUnifiedItems(a, b, sort));
	other.sort((a, b) => compareUnifiedItems(a, b, sort));
	return [...folders, ...other];
}

export async function listLibraryPage(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	opts: {
		folderId?: string | null;
		q?: string;
		sort?: DocsLibrarySort;
		page?: number;
	}
): Promise<DocsLibraryPage | null> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return null;
	}

	const folderId = opts.folderId ?? null;
	if (!(await resolveFolderInModule(moduleId, folderId))) {
		return null;
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);

	if (!canViewFolder(userId, folderId, access, permCtx)) {
		return null;
	}

	const q = opts.q?.trim() ?? '';
	const sort = opts.sort ?? parseDocsLibrarySort(null);
	const page = Math.max(1, opts.page ?? 1);
	const breadcrumbs = await buildBreadcrumbs(moduleId, folderId);
	const canEditCurrentFolder = canEditFolder(userId, folderId, access, permCtx);

	const folderRows = await db
		.select({
			id: docFolder.id,
			name: docFolder.name,
			color: docFolder.color,
			position: docFolder.position,
			ownerUserId: docFolder.ownerUserId,
			updatedAt: docFolder.updatedAt,
			createdAt: docFolder.createdAt
		})
		.from(docFolder)
		.where(
			and(
				eq(docFolder.moduleId, moduleId),
				folderParentCondition(folderId),
				q ? librarySearchWhere(q, { folderName: docFolder.name }) : undefined
			)
		);

	const docRows = await db
		.select({
			id: docPage.id,
			title: docPage.title,
			previewText: docPage.previewText,
			updatedAt: docPage.updatedAt,
			createdAt: docPage.createdAt,
			position: docPage.position
		})
		.from(docPage)
		.where(
			and(
				eq(docPage.moduleId, moduleId),
				itemFolderCondition(docPage, folderId),
				q
					? librarySearchWhere(q, {
							docTitle: docPage.title,
							docPreview: docPage.previewText
						})
					: undefined
			)
		);

	const assetRows = await db
		.select({
			id: docAsset.id,
			kind: docAsset.kind,
			title: docAsset.title,
			position: docAsset.position,
			updatedAt: docAsset.updatedAt,
			createdAt: docAsset.createdAt,
			mimeType: docAsset.mimeType,
			url: docAsset.url,
			linkImage: docAsset.linkImage,
			siteName: docAsset.siteName
		})
		.from(docAsset)
		.where(
			and(
				eq(docAsset.moduleId, moduleId),
				itemFolderCondition(docAsset, folderId),
				q
					? librarySearchWhere(q, {
							assetTitle: docAsset.title,
							assetUrl: docAsset.url
						})
					: undefined
			)
		);

	const folderEntries: { row: DocsLibraryFolderRow; createdAt: Date }[] = [];
	for (const f of folderRows) {
		if (!canViewFolder(userId, f.id, access, permCtx)) continue;
		const canEdit = canEditFolder(userId, f.id, access, permCtx);
		const canManageSharing = canManageFolderSharing(userId, f.id, permCtx);
		const ownerUserId = f.ownerUserId;
		const folderGrants = permCtx.grants
			.filter((g) => g.folderId === f.id)
			.map((g) => ({ userId: g.userId, level: g.level }));
		folderEntries.push({
			row: {
				id: f.id,
				name: f.name,
				color: parseDocFolderColor(f.color),
				position: f.position,
				updatedAt: f.updatedAt,
				ownerUserId,
				isOwner: ownerUserId === userId,
				canEdit,
				canManageSharing,
				restricted: isFolderRestricted(f.id, permCtx.grants),
				grants: canManageSharing ? folderGrants : []
			},
			createdAt: f.createdAt
		});
	}

	const docs: DocsLibraryDocRow[] = docRows.map((d) => ({
		id: d.id,
		title: d.title,
		previewText: d.previewText,
		updatedAt: d.updatedAt,
		position: d.position,
		canEdit: canEditFolder(userId, folderId, access, permCtx)
	}));

	const assets: DocsLibraryAssetRow[] = assetRows.map((a) => ({
		id: a.id,
		kind: a.kind as 'upload' | 'link',
		title: a.title,
		position: a.position,
		updatedAt: a.updatedAt,
		mimeType: a.mimeType,
		url: a.url,
		linkImage: a.linkImage,
		siteName: a.siteName,
		canEdit: canEditFolder(userId, folderId, access, permCtx)
	}));

	const unified: UnifiedItem[] = [
		...folderEntries.map(({ row, createdAt }) => ({
			kind: 'folder' as const,
			row,
			sortName: row.name.toLowerCase(),
			sortUpdated: row.updatedAt,
			sortCreated: createdAt
		})),
		...docRows.map((d, i) => ({
			kind: 'doc' as const,
			row: docs[i]!,
			sortName: d.title.toLowerCase(),
			sortUpdated: d.updatedAt,
			sortCreated: d.createdAt
		})),
		...assetRows.map((a, i) => ({
			kind: 'asset' as const,
			row: assets[i]!,
			sortName: a.title.toLowerCase(),
			sortUpdated: a.updatedAt,
			sortCreated: a.createdAt
		}))
	];

	const sorted = sortUnified(unified, sort);
	const totalCount = sorted.length;
	const start = (page - 1) * DOCS_LIBRARY_PER_PAGE;
	const slice = sorted.slice(start, start + DOCS_LIBRARY_PER_PAGE);

	const items: DocsLibraryListItem[] = [];
	const outFolders: DocsLibraryFolderRow[] = [];
	const outDocs: DocsLibraryDocRow[] = [];
	const outAssets: DocsLibraryAssetRow[] = [];
	for (const item of slice) {
		if (item.kind === 'folder') {
			outFolders.push(item.row);
			items.push({ kind: 'folder', folder: item.row });
		} else if (item.kind === 'doc') {
			outDocs.push(item.row);
			items.push({ kind: 'doc', doc: item.row });
		} else {
			outAssets.push(item.row);
			items.push({ kind: 'asset', asset: item.row });
		}
	}

	return {
		items,
		folders: outFolders,
		docs: outDocs,
		assets: outAssets,
		breadcrumbs,
		currentFolderId: folderId,
		totalCount,
		page,
		perPage: DOCS_LIBRARY_PER_PAGE,
		q,
		sort,
		canEditCurrentFolder
	};
}

export type DocsLibraryPreviewItem =
	| { kind: 'folder'; title: string; color: string | null }
	| { kind: 'doc'; title: string }
	| { kind: 'asset'; title: string; assetKind: 'upload' | 'link' };

export async function listRootLibraryPreviewItems(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	limit: number
): Promise<{ items: DocsLibraryPreviewItem[]; totalCount: number; moreCount: number }> {
	const empty = { items: [] as DocsLibraryPreviewItem[], totalCount: 0, moreCount: 0 };

	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return empty;
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);

	if (!canViewFolder(userId, null, access, permCtx)) {
		return empty;
	}

	const folderRows = await db
		.select({
			id: docFolder.id,
			name: docFolder.name,
			color: docFolder.color,
			updatedAt: docFolder.updatedAt,
			createdAt: docFolder.createdAt
		})
		.from(docFolder)
		.where(and(eq(docFolder.moduleId, moduleId), isNull(docFolder.parentId)));

	const docRows = await db
		.select({
			title: docPage.title,
			updatedAt: docPage.updatedAt,
			createdAt: docPage.createdAt
		})
		.from(docPage)
		.where(and(eq(docPage.moduleId, moduleId), isNull(docPage.folderId)));

	const assetRows = await db
		.select({
			kind: docAsset.kind,
			title: docAsset.title,
			updatedAt: docAsset.updatedAt,
			createdAt: docAsset.createdAt
		})
		.from(docAsset)
		.where(and(eq(docAsset.moduleId, moduleId), isNull(docAsset.folderId)));

	const unified: UnifiedItem[] = [];

	for (const f of folderRows) {
		if (!canViewFolder(userId, f.id, access, permCtx)) continue;
		const color = parseDocFolderColor(f.color);
		unified.push({
			kind: 'folder',
			row: {
				id: f.id,
				name: f.name,
				color,
				position: 0,
				updatedAt: f.updatedAt,
				ownerUserId: null,
				isOwner: false,
				canEdit: false,
				canManageSharing: false,
				restricted: false,
				grants: []
			},
			sortName: f.name.toLowerCase(),
			sortUpdated: f.updatedAt,
			sortCreated: f.createdAt
		});
	}

	for (const d of docRows) {
		unified.push({
			kind: 'doc',
			row: {
				id: '',
				title: d.title,
				previewText: '',
				updatedAt: d.updatedAt,
				position: 0,
				canEdit: false
			},
			sortName: d.title.toLowerCase(),
			sortUpdated: d.updatedAt,
			sortCreated: d.createdAt
		});
	}

	for (const a of assetRows) {
		unified.push({
			kind: 'asset',
			row: {
				id: '',
				kind: a.kind as 'upload' | 'link',
				title: a.title,
				position: 0,
				updatedAt: a.updatedAt,
				mimeType: null,
				url: null,
				linkImage: null,
				siteName: null,
				canEdit: false
			},
			sortName: a.title.toLowerCase(),
			sortUpdated: a.updatedAt,
			sortCreated: a.createdAt
		});
	}

	const sorted = sortUnified(unified, 'updated');
	const totalCount = sorted.length;
	const slice = sorted.slice(0, limit);

	const items: DocsLibraryPreviewItem[] = slice.map((item) => {
		if (item.kind === 'folder') {
			return { kind: 'folder', title: item.row.name, color: item.row.color };
		}
		if (item.kind === 'doc') {
			return { kind: 'doc', title: item.row.title };
		}
		return {
			kind: 'asset',
			title: item.row.title,
			assetKind: item.row.kind
		};
	});

	return {
		items,
		totalCount,
		moreCount: Math.max(0, totalCount - items.length)
	};
}

export async function listWrkspaceMembersForDocs(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<DocsLibraryMember[]> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return [];
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return [];

	const rows = await db
		.select({
			userId: user.id,
			name: user.name,
			image: user.image
		})
		.from(wrkspaceMember)
		.innerJoin(user, eq(wrkspaceMember.userId, user.id))
		.where(eq(wrkspaceMember.wrkspaceId, access.wrkspaceId))
		.orderBy(asc(user.name));

	return rows;
}

export type DocsFolderSharingDetails = {
	ownerUserId: string | null;
	grants: { userId: string; level: DocsFolderGrantLevel }[];
};

export async function getFolderSharingDetails(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	folderId: string
): Promise<DocsFolderSharingDetails | null> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return null;
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canManageFolderSharing(userId, folderId, permCtx)) {
		return null;
	}

	const [folder] = await db
		.select({ ownerUserId: docFolder.ownerUserId })
		.from(docFolder)
		.where(and(eq(docFolder.id, folderId), eq(docFolder.moduleId, moduleId)))
		.limit(1);
	if (!folder) return null;

	const grants = (await loadFolderGrantsForModule(moduleId))
		.filter((g) => g.folderId === folderId)
		.map((g) => ({ userId: g.userId, level: g.level }));

	return {
		ownerUserId: folder.ownerUserId,
		grants
	};
}

export async function setFolderGrants(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	folderId: string,
	grants: DocsFolderGrantInput[],
	newOwnerUserId?: string | null
): Promise<boolean> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canManageFolderSharing(userId, folderId, permCtx)) {
		return false;
	}

	const [folder] = await db
		.select({ id: docFolder.id, ownerUserId: docFolder.ownerUserId })
		.from(docFolder)
		.where(and(eq(docFolder.id, folderId), eq(docFolder.moduleId, moduleId)))
		.limit(1);
	if (!folder) return false;

	let ownerUserId = folder.ownerUserId;

	if (newOwnerUserId && newOwnerUserId !== ownerUserId) {
		if (!access) return false;
		const [member] = await db
			.select({ userId: wrkspaceMember.userId })
			.from(wrkspaceMember)
			.where(
				and(
					eq(wrkspaceMember.wrkspaceId, access.wrkspaceId),
					eq(wrkspaceMember.userId, newOwnerUserId)
				)
			)
			.limit(1);
		if (!member) return false;

		ownerUserId = newOwnerUserId;
		await db
			.update(docFolder)
			.set({ ownerUserId: newOwnerUserId, updatedAt: new Date() })
			.where(eq(docFolder.id, folderId));
	}

	const grantsToSave = grants
		.filter((g) => g.level === 'view' || g.level === 'edit')
		.filter((g) => g.userId !== ownerUserId);

	await db.delete(docFolderGrant).where(eq(docFolderGrant.folderId, folderId));

	for (const grant of grantsToSave) {
		await db.insert(docFolderGrant).values({
			id: uniqueId(),
			folderId,
			userId: grant.userId,
			level: grant.level,
			createdAt: new Date()
		});
	}

	const ctx = await getModuleContext(moduleId);
	if (ctx) {
		await recordActivity({
			wrkspaceId: ctx.wrkspaceId,
			actorUserId: userId,
			type: 'doc.folder_shared',
			moduleId: ctx.moduleId,
			moduleType: ctx.moduleType,
			targetType: 'doc',
			targetId: folderId,
			metadata: { title: folderId }
		});
	}

	return true;
}

async function nextFolderPosition(moduleId: string, parentId: string | null): Promise<number> {
	const [maxRow] = await db
		.select({ max: docFolder.position })
		.from(docFolder)
		.where(and(eq(docFolder.moduleId, moduleId), folderParentCondition(parentId)))
		.orderBy(desc(docFolder.position))
		.limit(1);
	return (maxRow?.max ?? -1) + 1;
}

async function nextDocPosition(moduleId: string, folderId: string | null): Promise<number> {
	const [maxRow] = await db
		.select({ max: docPage.position })
		.from(docPage)
		.where(and(eq(docPage.moduleId, moduleId), itemFolderCondition(docPage, folderId)))
		.orderBy(desc(docPage.position))
		.limit(1);
	return (maxRow?.max ?? -1) + 1;
}

async function nextAssetPosition(moduleId: string, folderId: string | null): Promise<number> {
	const [maxRow] = await db
		.select({ max: docAsset.position })
		.from(docAsset)
		.where(and(eq(docAsset.moduleId, moduleId), itemFolderCondition(docAsset, folderId)))
		.orderBy(desc(docAsset.position))
		.limit(1);
	return (maxRow?.max ?? -1) + 1;
}

export async function createFolder(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	parentId: string | null,
	name: string
): Promise<string | undefined> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const trimmed = name.trim();
	if (!trimmed) return undefined;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canEditFolder(userId, parentId, access, permCtx)) {
		return undefined;
	}

	if (parentId && !(await resolveFolderInModule(moduleId, parentId))) {
		return undefined;
	}

	const id = uniqueId();
	const now = new Date();
	await db.insert(docFolder).values({
		id,
		moduleId,
		parentId: parentId ?? null,
		name: trimmed,
		position: await nextFolderPosition(moduleId, parentId),
		ownerUserId: userId,
		createdAt: now,
		updatedAt: now
	});

	const ctx = await getModuleContext(moduleId);
	if (ctx) {
		await recordActivity({
			wrkspaceId: ctx.wrkspaceId,
			actorUserId: userId,
			type: 'doc.folder_created',
			moduleId: ctx.moduleId,
			moduleType: ctx.moduleType,
			targetType: 'doc',
			targetId: id,
			metadata: { title: trimmed }
		});
	}

	return id;
}

export async function renameFolder(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	folderId: string,
	name: string
): Promise<boolean> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	const trimmed = name.trim();
	if (!trimmed) return false;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canEditFolder(userId, folderId, access, permCtx)) {
		return false;
	}

	const updated = await db
		.update(docFolder)
		.set({ name: trimmed, updatedAt: new Date() })
		.where(and(eq(docFolder.id, folderId), eq(docFolder.moduleId, moduleId)))
		.returning({ id: docFolder.id });

	return updated.length > 0;
}

export async function setFolderColor(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	folderId: string,
	color: string | null
): Promise<boolean> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	const parsed = color === null || color === '' ? null : parseDocFolderColor(color);
	if (color !== null && color !== '' && parsed === null) {
		return false;
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canEditFolder(userId, folderId, access, permCtx)) {
		return false;
	}

	const updated = await db
		.update(docFolder)
		.set({ color: parsed, updatedAt: new Date() })
		.where(and(eq(docFolder.id, folderId), eq(docFolder.moduleId, moduleId)))
		.returning({ id: docFolder.id });

	return updated.length > 0;
}

async function folderHasChildren(moduleId: string, folderId: string): Promise<boolean> {
	const [childFolder] = await db
		.select({ id: docFolder.id })
		.from(docFolder)
		.where(and(eq(docFolder.moduleId, moduleId), eq(docFolder.parentId, folderId)))
		.limit(1);
	if (childFolder) return true;

	const [childDoc] = await db
		.select({ id: docPage.id })
		.from(docPage)
		.where(and(eq(docPage.moduleId, moduleId), eq(docPage.folderId, folderId)))
		.limit(1);
	if (childDoc) return true;

	const [childAsset] = await db
		.select({ id: docAsset.id })
		.from(docAsset)
		.where(and(eq(docAsset.moduleId, moduleId), eq(docAsset.folderId, folderId)))
		.limit(1);
	return !!childAsset;
}

export async function listFoldersForMove(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<DocsMoveFolderTree | null> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return null;
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);

	const rows = await db
		.select({
			id: docFolder.id,
			name: docFolder.name,
			parentId: docFolder.parentId
		})
		.from(docFolder)
		.where(eq(docFolder.moduleId, moduleId))
		.orderBy(asc(docFolder.name));

	const folders: DocsMoveFolderEntry[] = [];
	for (const row of rows) {
		if (!canEditFolder(userId, row.id, access, permCtx)) continue;
		folders.push({
			id: row.id,
			name: row.name,
			parentId: row.parentId
		});
	}

	return {
		canEditRoot: canEditFolder(userId, null, access, permCtx),
		folders
	};
}

export async function deleteLibraryDoc(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	docId: string
): Promise<boolean> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	const [row] = await db
		.select({ folderId: docPage.folderId })
		.from(docPage)
		.where(and(eq(docPage.id, docId), eq(docPage.moduleId, moduleId)))
		.limit(1);
	if (!row) return false;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canEditFolder(userId, row.folderId, access, permCtx)) {
		return false;
	}

	await db.delete(docPage).where(and(eq(docPage.id, docId), eq(docPage.moduleId, moduleId)));
	return true;
}

export async function deleteLibraryAsset(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	assetId: string
): Promise<boolean> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	const [row] = await db
		.select({
			folderId: docAsset.folderId,
			kind: docAsset.kind,
			storageKey: docAsset.storageKey
		})
		.from(docAsset)
		.where(and(eq(docAsset.id, assetId), eq(docAsset.moduleId, moduleId)))
		.limit(1);
	if (!row) return false;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canEditFolder(userId, row.folderId, access, permCtx)) {
		return false;
	}

	if (row.kind === 'upload' && row.storageKey) {
		try {
			await deleteObject(row.storageKey);
		} catch {
			// Continue removing DB row even if object is already gone.
		}
	}

	await db.delete(docAsset).where(and(eq(docAsset.id, assetId), eq(docAsset.moduleId, moduleId)));
	return true;
}

export async function deleteFolder(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	folderId: string,
	force: boolean
): Promise<boolean> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canEditFolder(userId, folderId, access, permCtx)) {
		return false;
	}

	if (!force && (await folderHasChildren(moduleId, folderId))) {
		return false;
	}

	await db
		.delete(docFolder)
		.where(and(eq(docFolder.id, folderId), eq(docFolder.moduleId, moduleId)));
	return true;
}

function sanitizeOriginalName(name: string): string {
	const base = name.replace(/[/\\]/g, '_').trim();
	return base.slice(0, 255) || 'file';
}

export function docAssetPublicUrl(moduleId: string, assetId: string): string {
	return `/api/docs/assets/${encodeURIComponent(assetId)}`;
}

export async function createLinkAsset(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	folderId: string | null,
	url: string,
	title?: string
): Promise<string | undefined> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const parsed = parsePreviewUrl(url);
	if (!parsed) return undefined;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canEditFolder(userId, folderId, access, permCtx)) {
		return undefined;
	}

	const preview = await fetchLinkPreview(parsed.toString());
	const displayTitle = title?.trim() || preview?.title || parsed.hostname;

	const id = uniqueId();
	const now = new Date();
	await db.insert(docAsset).values({
		id,
		moduleId,
		folderId: folderId ?? null,
		kind: 'link',
		title: displayTitle,
		position: await nextAssetPosition(moduleId, folderId),
		url: parsed.toString(),
		linkTitle: preview?.title ?? null,
		linkDescription: preview?.description ?? null,
		linkImage: preview?.image ?? null,
		siteName: preview?.siteName ?? null,
		createdBy: userId,
		createdAt: now,
		updatedAt: now
	});

	const ctx = await getModuleContext(moduleId);
	if (ctx) {
		await recordActivity({
			wrkspaceId: ctx.wrkspaceId,
			actorUserId: userId,
			type: 'doc.asset_linked',
			moduleId: ctx.moduleId,
			moduleType: ctx.moduleType,
			targetType: 'doc',
			targetId: id,
			metadata: { title: displayTitle }
		});
	}

	return id;
}

export async function addUploadAsset(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	folderId: string | null,
	file: File
): Promise<string | undefined> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const ext = MIME_TO_EXT[file.type];
	if (!ext) return undefined;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canEditFolder(userId, folderId, access, permCtx)) {
		return undefined;
	}

	const [modRow] = await db
		.select({ wrkspaceId: wrkspaceModule.wrkspaceId })
		.from(wrkspaceModule)
		.where(eq(wrkspaceModule.id, moduleId))
		.limit(1);

	const tier =
		(modRow && (await getSubscriptionTierForWrkspaceId(modRow.wrkspaceId))) ??
		DEFAULT_SUBSCRIPTION_TIER;
	const maxBytes = getPlanLimits(tier).maxUploadBytes;
	if (file.size > maxBytes) {
		throw new Error(`File must be ${formatUploadLimit(maxBytes)} or smaller`);
	}

	const id = uniqueId();
	const storageKey = docsAssetKey(moduleId, id, ext);
	const buffer = Buffer.from(await file.arrayBuffer());
	await putObject(storageKey, buffer, file.type);

	const originalName = sanitizeOriginalName(file.name);
	const now = new Date();
	await db.insert(docAsset).values({
		id,
		moduleId,
		folderId: folderId ?? null,
		kind: 'upload',
		title: originalName,
		position: await nextAssetPosition(moduleId, folderId),
		originalName,
		mimeType: file.type,
		sizeBytes: file.size,
		storageKey,
		createdBy: userId,
		createdAt: now,
		updatedAt: now
	});

	const ctx = await getModuleContext(moduleId);
	if (ctx) {
		await recordActivity({
			wrkspaceId: ctx.wrkspaceId,
			actorUserId: userId,
			type: 'doc.asset_uploaded',
			moduleId: ctx.moduleId,
			moduleType: ctx.moduleType,
			targetType: 'doc',
			targetId: id,
			metadata: { title: originalName }
		});
	}

	return id;
}

export async function moveLibraryItem(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	itemType: DocsLibraryItemType,
	itemId: string,
	targetFolderId: string | null
): Promise<boolean> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	if (targetFolderId && !(await resolveFolderInModule(moduleId, targetFolderId))) {
		return false;
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);

	let sourceFolderId: string | null = null;

	if (itemType === 'folder') {
		if (itemId === targetFolderId) return false;
		const [row] = await db
			.select({ parentId: docFolder.parentId })
			.from(docFolder)
			.where(and(eq(docFolder.id, itemId), eq(docFolder.moduleId, moduleId)))
			.limit(1);
		if (!row) return false;
		sourceFolderId = row.parentId;
		if (!canEditFolder(userId, sourceFolderId, access, permCtx)) return false;
		if (!canEditFolder(userId, targetFolderId, access, permCtx)) return false;
		if (targetFolderId) {
			let walk: string | null = targetFolderId;
			while (walk) {
				if (walk === itemId) return false;
				const [p] = await db
					.select({ parentId: docFolder.parentId })
					.from(docFolder)
					.where(eq(docFolder.id, walk))
					.limit(1);
				walk = p?.parentId ?? null;
			}
		}
		await db
			.update(docFolder)
			.set({
				parentId: targetFolderId,
				position: await nextFolderPosition(moduleId, targetFolderId),
				updatedAt: new Date()
			})
			.where(and(eq(docFolder.id, itemId), eq(docFolder.moduleId, moduleId)));
	} else if (itemType === 'doc') {
		const [row] = await db
			.select({ folderId: docPage.folderId })
			.from(docPage)
			.where(and(eq(docPage.id, itemId), eq(docPage.moduleId, moduleId)))
			.limit(1);
		if (!row) return false;
		sourceFolderId = row.folderId;
		if (!canEditFolder(userId, sourceFolderId, access, permCtx)) return false;
		if (!canEditFolder(userId, targetFolderId, access, permCtx)) return false;
		await db
			.update(docPage)
			.set({
				folderId: targetFolderId,
				position: await nextDocPosition(moduleId, targetFolderId),
				updatedAt: new Date()
			})
			.where(and(eq(docPage.id, itemId), eq(docPage.moduleId, moduleId)));
	} else {
		const [row] = await db
			.select({ folderId: docAsset.folderId })
			.from(docAsset)
			.where(and(eq(docAsset.id, itemId), eq(docAsset.moduleId, moduleId)))
			.limit(1);
		if (!row) return false;
		sourceFolderId = row.folderId;
		if (!canEditFolder(userId, sourceFolderId, access, permCtx)) return false;
		if (!canEditFolder(userId, targetFolderId, access, permCtx)) return false;
		await db
			.update(docAsset)
			.set({
				folderId: targetFolderId,
				position: await nextAssetPosition(moduleId, targetFolderId),
				updatedAt: new Date()
			})
			.where(and(eq(docAsset.id, itemId), eq(docAsset.moduleId, moduleId)));
	}

	const ctx = await getModuleContext(moduleId);
	if (ctx) {
		await recordActivity({
			wrkspaceId: ctx.wrkspaceId,
			actorUserId: userId,
			type: 'doc.item_moved',
			moduleId: ctx.moduleId,
			moduleType: ctx.moduleType,
			targetType: 'doc',
			targetId: itemId,
			metadata: { title: itemType }
		});
	}

	return true;
}

export type DocAssetDetail = {
	id: string;
	moduleId: string;
	folderId: string | null;
	kind: 'upload' | 'link';
	title: string;
	originalName: string | null;
	mimeType: string | null;
	sizeBytes: number | null;
	url: string | null;
	linkTitle: string | null;
	linkDescription: string | null;
	linkImage: string | null;
	siteName: string | null;
	updatedAt: Date;
	canEdit: boolean;
};

export async function getAssetForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	assetId: string
): Promise<DocAssetDetail | undefined> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const [row] = await db
		.select()
		.from(docAsset)
		.where(and(eq(docAsset.id, assetId), eq(docAsset.moduleId, moduleId)))
		.limit(1);

	if (!row) return undefined;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canViewFolder(userId, row.folderId, access, permCtx)) {
		return undefined;
	}

	return {
		id: row.id,
		moduleId: row.moduleId,
		folderId: row.folderId,
		kind: row.kind as 'upload' | 'link',
		title: row.title,
		originalName: row.originalName,
		mimeType: row.mimeType,
		sizeBytes: row.sizeBytes,
		url: row.url,
		linkTitle: row.linkTitle,
		linkDescription: row.linkDescription,
		linkImage: row.linkImage,
		siteName: row.siteName,
		updatedAt: row.updatedAt,
		canEdit: canEditFolder(userId, row.folderId, access, permCtx)
	};
}

export async function getDocAssetTextPreviewForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	assetId: string
): Promise<string | null> {
	const file = await getDocAssetFileForUser(userId, teamSlug, wrkspaceSlug, moduleId, assetId);
	if (!file || file.row.kind !== 'upload') {
		return null;
	}

	return extractDocAssetTextPreview(
		file.body,
		file.row.mimeType,
		file.row.originalName ?? file.row.title
	);
}

export async function getDocAssetFileForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	assetId: string
): Promise<{ row: typeof docAsset.$inferSelect; body: Buffer } | undefined> {
	const detail = await getAssetForUser(userId, teamSlug, wrkspaceSlug, moduleId, assetId);
	if (!detail || detail.kind !== 'upload') return undefined;

	const [row] = await db
		.select()
		.from(docAsset)
		.where(and(eq(docAsset.id, assetId), eq(docAsset.moduleId, moduleId)))
		.limit(1);

	if (!row?.storageKey) return undefined;

	const { body } = await getObject(row.storageKey);
	return { row, body };
}
