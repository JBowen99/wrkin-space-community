import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { TaskLinkInput, TaskLinkTargetType, TaskTagRow } from '../shared/task-links';
import { isTaskLinkTargetType, normalizeTagName } from '../shared/task-links';
import { db } from './db/index.ts';
import {
	decisionLink,
	decisionRecord,
	docPage,
	forumThread,
	okrCycle,
	okrKeyResult,
	okrObjective,
	taskComment,
	taskItem,
	taskItemTag,
	taskLink,
	wrkspaceModule,
	wrkspaceTag
} from './db/schema.ts';
import { buildWrkspaceItemHref } from './wrkspace-links.ts';
import { uniqueId } from '../shared/slug';

export type TaskLinkRow = {
	id: string;
	targetType: TaskLinkTargetType;
	targetId: string;
	moduleId: string;
	moduleTitle: string;
	title: string;
	href: string;
};

export type TaskBacklinkRow = {
	sourceType: 'decision' | 'task' | 'okr';
	sourceId: string;
	moduleId: string;
	moduleTitle: string;
	title: string;
	href: string;
};

async function resolveLinkTitle(targetType: TaskLinkTargetType, targetId: string): Promise<string> {
	switch (targetType) {
		case 'task': {
			const [row] = await db
				.select({ title: taskItem.title })
				.from(taskItem)
				.where(eq(taskItem.id, targetId))
				.limit(1);
			return row?.title ?? 'Task';
		}
		case 'doc_page': {
			const [row] = await db
				.select({ title: docPage.title })
				.from(docPage)
				.where(eq(docPage.id, targetId))
				.limit(1);
			return row?.title ?? 'Document';
		}
		case 'forum_thread': {
			const [row] = await db
				.select({ title: forumThread.title })
				.from(forumThread)
				.where(eq(forumThread.id, targetId))
				.limit(1);
			return row?.title ?? 'Thread';
		}
		case 'decision': {
			const [row] = await db
				.select({ title: decisionRecord.title })
				.from(decisionRecord)
				.where(eq(decisionRecord.id, targetId))
				.limit(1);
			return row?.title ?? 'Decision';
		}
		default:
			return 'Link';
	}
}

export async function loadTagsForTasks(taskIds: string[]): Promise<Map<string, TaskTagRow[]>> {
	const map = new Map<string, TaskTagRow[]>();
	if (taskIds.length === 0) return map;

	const rows = await db
		.select({
			taskId: taskItemTag.taskId,
			id: wrkspaceTag.id,
			name: wrkspaceTag.name,
			color: wrkspaceTag.color
		})
		.from(taskItemTag)
		.innerJoin(wrkspaceTag, eq(taskItemTag.tagId, wrkspaceTag.id))
		.where(inArray(taskItemTag.taskId, taskIds))
		.orderBy(asc(wrkspaceTag.name));

	for (const row of rows) {
		const list = map.get(row.taskId) ?? [];
		list.push({ id: row.id, name: row.name, color: row.color });
		map.set(row.taskId, list);
	}

	return map;
}

export async function loadCommentCountsForTasks(taskIds: string[]): Promise<Map<string, number>> {
	const map = new Map<string, number>();
	if (taskIds.length === 0) return map;

	const rows = await db
		.select({
			taskId: taskComment.taskId,
			value: sql<number>`count(*)::int`
		})
		.from(taskComment)
		.where(inArray(taskComment.taskId, taskIds))
		.groupBy(taskComment.taskId);

	for (const row of rows) {
		map.set(row.taskId, Number(row.value ?? 0));
	}

	return map;
}

export async function loadLinksForTasks(
	taskIds: string[],
	teamSlug: string,
	wrkspaceSlug: string
): Promise<Map<string, TaskLinkRow[]>> {
	const map = new Map<string, TaskLinkRow[]>();
	if (taskIds.length === 0) return map;

	const linkRows = await db
		.select({
			id: taskLink.id,
			taskId: taskLink.taskId,
			targetType: taskLink.targetType,
			targetId: taskLink.targetId,
			moduleId: taskLink.moduleId,
			moduleTitle: wrkspaceModule.title
		})
		.from(taskLink)
		.innerJoin(wrkspaceModule, eq(taskLink.moduleId, wrkspaceModule.id))
		.where(inArray(taskLink.taskId, taskIds));

	for (const link of linkRows) {
		if (!isTaskLinkTargetType(link.targetType)) continue;
		const title = await resolveLinkTitle(link.targetType, link.targetId);
		const row: TaskLinkRow = {
			id: link.id,
			targetType: link.targetType,
			targetId: link.targetId,
			moduleId: link.moduleId,
			moduleTitle: link.moduleTitle,
			title,
			href: buildWrkspaceItemHref(
				teamSlug,
				wrkspaceSlug,
				link.targetType,
				link.moduleId,
				link.targetId
			)
		};
		const list = map.get(link.taskId) ?? [];
		list.push(row);
		map.set(link.taskId, list);
	}

	return map;
}

export async function listWrkspaceTags(wrkspaceId: string): Promise<TaskTagRow[]> {
	return db
		.select({
			id: wrkspaceTag.id,
			name: wrkspaceTag.name,
			color: wrkspaceTag.color
		})
		.from(wrkspaceTag)
		.where(eq(wrkspaceTag.wrkspaceId, wrkspaceId))
		.orderBy(asc(wrkspaceTag.name));
}

export async function ensureWrkspaceTag(
	wrkspaceId: string,
	rawName: string
): Promise<string | undefined> {
	const name = normalizeTagName(rawName);
	if (!name) return undefined;

	const existing = await db
		.select({ id: wrkspaceTag.id })
		.from(wrkspaceTag)
		.where(and(eq(wrkspaceTag.wrkspaceId, wrkspaceId), eq(wrkspaceTag.name, name)))
		.limit(1);

	if (existing[0]) return existing[0].id;

	const id = uniqueId();
	await db.insert(wrkspaceTag).values({ id, wrkspaceId, name });
	return id;
}

export async function resolveTagIdsForWrkspace(
	wrkspaceId: string,
	tagIds: string[],
	newTagNames: string[]
): Promise<string[]> {
	const validIds = new Set<string>();

	if (tagIds.length > 0) {
		const rows = await db
			.select({ id: wrkspaceTag.id })
			.from(wrkspaceTag)
			.where(and(eq(wrkspaceTag.wrkspaceId, wrkspaceId), inArray(wrkspaceTag.id, tagIds)));
		for (const row of rows) {
			validIds.add(row.id);
		}
	}

	for (const rawName of newTagNames) {
		const id = await ensureWrkspaceTag(wrkspaceId, rawName);
		if (id) validIds.add(id);
	}

	return [...validIds];
}

export async function replaceTaskTags(taskId: string, tagIds: string[]): Promise<void> {
	await db.delete(taskItemTag).where(eq(taskItemTag.taskId, taskId));
	const unique = [...new Set(tagIds.filter(Boolean))];
	if (unique.length === 0) return;

	await db.insert(taskItemTag).values(unique.map((tagId) => ({ taskId, tagId })));
}

export async function validateTaskLinksInWrkspace(
	wrkspaceId: string,
	links: TaskLinkInput[],
	taskId?: string
): Promise<boolean> {
	if (links.length === 0) return true;

	const moduleIds = [...new Set(links.map((l) => l.moduleId))];
	const modules = await db
		.select({ id: wrkspaceModule.id, type: wrkspaceModule.type })
		.from(wrkspaceModule)
		.where(and(eq(wrkspaceModule.wrkspaceId, wrkspaceId), inArray(wrkspaceModule.id, moduleIds)));

	const moduleById = new Map(modules.map((m) => [m.id, m.type]));

	for (const link of links) {
		const modType = moduleById.get(link.moduleId);
		if (!modType) return false;

		if (link.targetType === 'task' && modType !== 'tasks') return false;
		if (link.targetType === 'doc_page' && modType !== 'docs') return false;
		if (link.targetType === 'forum_thread' && modType !== 'forum') return false;
		if (link.targetType === 'decision' && modType !== 'decisions') return false;

		if (link.targetType === 'task' && taskId && link.targetId === taskId) return false;

		let exists = false;
		if (link.targetType === 'task') {
			const [row] = await db
				.select({ id: taskItem.id })
				.from(taskItem)
				.where(and(eq(taskItem.id, link.targetId), eq(taskItem.moduleId, link.moduleId)))
				.limit(1);
			exists = !!row;
		} else if (link.targetType === 'doc_page') {
			const [row] = await db
				.select({ id: docPage.id })
				.from(docPage)
				.where(and(eq(docPage.id, link.targetId), eq(docPage.moduleId, link.moduleId)))
				.limit(1);
			exists = !!row;
		} else if (link.targetType === 'forum_thread') {
			const [row] = await db
				.select({ id: forumThread.id })
				.from(forumThread)
				.where(and(eq(forumThread.id, link.targetId), eq(forumThread.moduleId, link.moduleId)))
				.limit(1);
			exists = !!row;
		} else if (link.targetType === 'decision') {
			const [row] = await db
				.select({ id: decisionRecord.id })
				.from(decisionRecord)
				.where(
					and(eq(decisionRecord.id, link.targetId), eq(decisionRecord.moduleId, link.moduleId))
				)
				.limit(1);
			exists = !!row;
		}

		if (!exists) return false;
	}

	return true;
}

export async function replaceTaskLinks(taskId: string, links: TaskLinkInput[]): Promise<void> {
	await db.delete(taskLink).where(eq(taskLink.taskId, taskId));
	const unique = links.filter(
		(l, i, arr) =>
			arr.findIndex(
				(x) =>
					x.targetType === l.targetType && x.targetId === l.targetId && x.moduleId === l.moduleId
			) === i
	);
	if (unique.length === 0) return;

	await db.insert(taskLink).values(
		unique.map((link) => ({
			id: uniqueId(),
			taskId,
			targetType: link.targetType,
			targetId: link.targetId,
			moduleId: link.moduleId
		}))
	);
}

export async function listTaskBacklinks(
	taskId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<TaskBacklinkRow[]> {
	const backlinks: TaskBacklinkRow[] = [];

	const decisionRows = await db
		.select({
			sourceId: decisionRecord.id,
			title: decisionRecord.title,
			moduleId: decisionRecord.moduleId,
			moduleTitle: wrkspaceModule.title
		})
		.from(decisionLink)
		.innerJoin(decisionRecord, eq(decisionLink.decisionId, decisionRecord.id))
		.innerJoin(wrkspaceModule, eq(decisionRecord.moduleId, wrkspaceModule.id))
		.where(and(eq(decisionLink.targetType, 'task'), eq(decisionLink.targetId, taskId)));

	for (const row of decisionRows) {
		backlinks.push({
			sourceType: 'decision',
			sourceId: row.sourceId,
			moduleId: row.moduleId,
			moduleTitle: row.moduleTitle,
			title: row.title,
			href: buildWrkspaceItemHref(teamSlug, wrkspaceSlug, 'decision', row.moduleId, row.sourceId)
		});
	}

	const taskLinkRows = await db
		.select({
			sourceId: taskItem.id,
			title: taskItem.title,
			moduleId: taskItem.moduleId,
			moduleTitle: wrkspaceModule.title
		})
		.from(taskLink)
		.innerJoin(taskItem, eq(taskLink.taskId, taskItem.id))
		.innerJoin(wrkspaceModule, eq(taskItem.moduleId, wrkspaceModule.id))
		.where(and(eq(taskLink.targetType, 'task'), eq(taskLink.targetId, taskId)));

	for (const row of taskLinkRows) {
		backlinks.push({
			sourceType: 'task',
			sourceId: row.sourceId,
			moduleId: row.moduleId,
			moduleTitle: row.moduleTitle,
			title: row.title,
			href: buildWrkspaceItemHref(teamSlug, wrkspaceSlug, 'task', row.moduleId, row.sourceId)
		});
	}

	const okrRows = await db
		.select({
			sourceId: okrKeyResult.id,
			title: okrKeyResult.title,
			moduleId: wrkspaceModule.id,
			moduleTitle: wrkspaceModule.title
		})
		.from(okrKeyResult)
		.innerJoin(okrObjective, eq(okrKeyResult.objectiveId, okrObjective.id))
		.innerJoin(okrCycle, eq(okrObjective.cycleId, okrCycle.id))
		.innerJoin(wrkspaceModule, eq(okrCycle.moduleId, wrkspaceModule.id))
		.where(eq(okrKeyResult.linkedTaskId, taskId));

	for (const row of okrRows) {
		backlinks.push({
			sourceType: 'okr',
			sourceId: row.sourceId,
			moduleId: row.moduleId,
			moduleTitle: row.moduleTitle,
			title: row.title,
			href: `/teams/${teamSlug}/wrkspaces/${wrkspaceSlug}/modules/${row.moduleId}`
		});
	}

	return backlinks;
}

export function parseTaskLinksFromForm(formData: FormData): TaskLinkInput[] {
	const raw = formData.get('links')?.toString() ?? '';
	if (!raw.trim()) return [];

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];

		const links: TaskLinkInput[] = [];
		for (const item of parsed) {
			if (!item || typeof item !== 'object') continue;
			const targetType = (item as { targetType?: string }).targetType ?? '';
			const targetId = (item as { targetId?: string }).targetId ?? '';
			const moduleId = (item as { moduleId?: string }).moduleId ?? '';
			if (!isTaskLinkTargetType(targetType) || !targetId || !moduleId) continue;
			links.push({ targetType, targetId, moduleId });
		}
		return links;
	} catch {
		return [];
	}
}
