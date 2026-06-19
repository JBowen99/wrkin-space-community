import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from './db/index.ts';
import { docAsset, docPage, team, wrkspace, wrkspaceModule } from './db/schema.ts';
import { getModuleContext, recordActivity } from './activity.ts';
import { getWrkspaceAccess } from './authorization.ts';
import { canEditFolder, canViewFolder, getDocsPermissionContext } from './doc-permissions.ts';
import { getModuleForUser } from './modules.ts';
import { listRootLibraryPreviewItems, type DocsLibraryPreviewItem } from './docs-library.ts';
import { uniqueId } from '../shared/slug';

export type DocPageRow = {
	id: string;
	title: string;
	previewText: string;
	updatedAt: Date;
};

export type DocPageDetail = DocPageRow & {
	moduleId: string;
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

export async function listDocPages(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<DocPageRow[]> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return [];
	}

	return db
		.select({
			id: docPage.id,
			title: docPage.title,
			previewText: docPage.previewText,
			updatedAt: docPage.updatedAt
		})
		.from(docPage)
		.where(eq(docPage.moduleId, moduleId))
		.orderBy(desc(docPage.updatedAt), asc(docPage.position), asc(docPage.createdAt));
}

export async function createDocPage(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	folderId?: string | null
): Promise<string | undefined> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	const targetFolderId = folderId ?? null;
	if (!canEditFolder(userId, targetFolderId, access, permCtx)) {
		return undefined;
	}

	const folderCondition = targetFolderId
		? eq(docPage.folderId, targetFolderId)
		: isNull(docPage.folderId);

	const [maxPos] = await db
		.select({ max: docPage.position })
		.from(docPage)
		.where(and(eq(docPage.moduleId, moduleId), folderCondition))
		.orderBy(desc(docPage.position))
		.limit(1);

	const id = uniqueId();
	const now = new Date();

	await db.insert(docPage).values({
		id,
		moduleId,
		folderId: targetFolderId,
		title: 'Untitled',
		position: (maxPos?.max ?? -1) + 1,
		previewText: '',
		createdAt: now,
		updatedAt: now
	});

	const ctx = await getModuleContext(moduleId);
	if (ctx) {
		await recordActivity({
			wrkspaceId: ctx.wrkspaceId,
			actorUserId: userId,
			type: 'doc.created',
			moduleId: ctx.moduleId,
			moduleType: ctx.moduleType,
			targetType: 'doc',
			targetId: id,
			metadata: { title: 'Untitled' }
		});
	}

	return id;
}

export async function getDocPageForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	docId: string
): Promise<DocPageDetail | undefined> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const rows = await db
		.select({
			id: docPage.id,
			moduleId: docPage.moduleId,
			folderId: docPage.folderId,
			title: docPage.title,
			previewText: docPage.previewText,
			updatedAt: docPage.updatedAt
		})
		.from(docPage)
		.where(and(eq(docPage.id, docId), eq(docPage.moduleId, moduleId)))
		.limit(1);

	const row = rows[0];
	if (!row) return undefined;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	if (!canViewFolder(userId, row.folderId, access, permCtx)) {
		return undefined;
	}

	return {
		id: row.id,
		moduleId: row.moduleId,
		title: row.title,
		previewText: row.previewText,
		updatedAt: row.updatedAt
	};
}

export async function userCanEditDocPage(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	docId: string
): Promise<boolean> {
	const rows = await db
		.select({ folderId: docPage.folderId })
		.from(docPage)
		.where(and(eq(docPage.id, docId), eq(docPage.moduleId, moduleId)))
		.limit(1);

	const row = rows[0];
	if (!row) return false;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, moduleId, access);
	return canEditFolder(userId, row.folderId, access, permCtx);
}

export async function updateDocPageTitle(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	docId: string,
	title: string
): Promise<boolean> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	if (!(await userCanEditDocPage(userId, teamSlug, wrkspaceSlug, moduleId, docId))) {
		return false;
	}

	const trimmed = title.trim();
	if (!trimmed) return false;

	const existing = await db
		.select({ title: docPage.title })
		.from(docPage)
		.where(and(eq(docPage.id, docId), eq(docPage.moduleId, moduleId)))
		.limit(1);

	if (!existing[0]) return false;

	const updated = await db
		.update(docPage)
		.set({ title: trimmed, updatedAt: new Date() })
		.where(and(eq(docPage.id, docId), eq(docPage.moduleId, moduleId)))
		.returning({ id: docPage.id });

	if (updated.length > 0 && existing[0].title !== trimmed) {
		const ctx = await getModuleContext(moduleId);
		if (ctx) {
			await recordActivity({
				wrkspaceId: ctx.wrkspaceId,
				actorUserId: userId,
				type: 'doc.title_changed',
				moduleId: ctx.moduleId,
				moduleType: ctx.moduleType,
				targetType: 'doc',
				targetId: docId,
				metadata: { title: trimmed, previousTitle: existing[0].title }
			});
		}
	}

	return updated.length > 0;
}

export async function userCanViewDoc(userId: string, docId: string): Promise<boolean> {
	const rows = await db
		.select({
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug,
			moduleId: docPage.moduleId,
			folderId: docPage.folderId
		})
		.from(docPage)
		.innerJoin(wrkspaceModule, eq(docPage.moduleId, wrkspaceModule.id))
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(docPage.id, docId))
		.limit(1);

	const row = rows[0];
	if (!row) return false;

	const { userCanAccessWrkspace } = await import('./authorization.ts');
	if (!(await userCanAccessWrkspace(userId, row.teamSlug, row.wrkspaceSlug))) {
		return false;
	}

	const access = await getWrkspaceAccess(userId, row.teamSlug, row.wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, row.moduleId, access);
	return canViewFolder(userId, row.folderId, access, permCtx);
}

/** @deprecated Use userCanViewDoc */
export async function userCanAccessDoc(userId: string, docId: string): Promise<boolean> {
	return userCanViewDoc(userId, docId);
}

export async function userCanEditDoc(userId: string, docId: string): Promise<boolean> {
	const rows = await db
		.select({
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug,
			moduleId: docPage.moduleId,
			folderId: docPage.folderId
		})
		.from(docPage)
		.innerJoin(wrkspaceModule, eq(docPage.moduleId, wrkspaceModule.id))
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(docPage.id, docId))
		.limit(1);

	const row = rows[0];
	if (!row) return false;

	const { userCanAccessWrkspace } = await import('./authorization.ts');
	if (!(await userCanAccessWrkspace(userId, row.teamSlug, row.wrkspaceSlug))) {
		return false;
	}

	const access = await getWrkspaceAccess(userId, row.teamSlug, row.wrkspaceSlug);
	const permCtx = await getDocsPermissionContext(userId, row.moduleId, access);
	return canEditFolder(userId, row.folderId, access, permCtx);
}

export const DOCS_MODULE_PREVIEW_LIMIT = 6;

export async function getDocsModulePreview(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<{
	items: DocsLibraryPreviewItem[];
	totalCount: number;
	moreCount: number;
}> {
	return listRootLibraryPreviewItems(
		userId,
		teamSlug,
		wrkspaceSlug,
		moduleId,
		DOCS_MODULE_PREVIEW_LIMIT
	);
}
