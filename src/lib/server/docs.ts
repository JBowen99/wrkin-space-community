import { and, asc, count, desc, eq } from 'drizzle-orm';
import { db } from './db';
import { docPage } from './db/schema';
import { getModuleContext, recordActivity } from './activity';
import { getModuleForUser } from './modules';
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
	moduleId: string
): Promise<string | undefined> {
	if (!(await assertDocsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const [maxPos] = await db
		.select({ max: docPage.position })
		.from(docPage)
		.where(eq(docPage.moduleId, moduleId))
		.orderBy(desc(docPage.position))
		.limit(1);

	const id = uniqueId();
	const now = new Date();

	await db.insert(docPage).values({
		id,
		moduleId,
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
			title: docPage.title,
			previewText: docPage.previewText,
			updatedAt: docPage.updatedAt
		})
		.from(docPage)
		.where(and(eq(docPage.id, docId), eq(docPage.moduleId, moduleId)))
		.limit(1);

	return rows[0];
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

export async function userCanAccessDoc(userId: string, docId: string): Promise<boolean> {
	const { userCanAccessDocById } = await import('./authorization');
	return userCanAccessDocById(userId, docId);
}

export const DOCS_MODULE_PREVIEW_LIMIT = 6;

export async function getDocsModulePreview(moduleId: string): Promise<{
	docs: { title: string }[];
	moreCount: number;
}> {
	const [countRow] = await db
		.select({ value: count() })
		.from(docPage)
		.where(eq(docPage.moduleId, moduleId));

	const total = Number(countRow?.value ?? 0);
	if (total === 0) {
		return { docs: [], moreCount: 0 };
	}

	const docs = await db
		.select({ title: docPage.title })
		.from(docPage)
		.where(eq(docPage.moduleId, moduleId))
		.orderBy(desc(docPage.updatedAt), asc(docPage.position), asc(docPage.createdAt))
		.limit(DOCS_MODULE_PREVIEW_LIMIT);

	return {
		docs,
		moreCount: Math.max(0, total - docs.length)
	};
}
