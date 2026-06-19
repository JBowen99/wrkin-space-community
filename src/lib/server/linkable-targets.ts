import { asc, desc, eq } from 'drizzle-orm';
import type { TaskLinkTargetType } from '../shared/task-links';
import { db } from './db/index.ts';
import { decisionRecord, docPage, forumThread, taskItem, wrkspaceModule } from './db/schema.ts';

export type LinkableTarget = {
	targetType: TaskLinkTargetType;
	targetId: string;
	moduleId: string;
	moduleTitle: string;
	title: string;
};

export async function listLinkableTargetsForWrkspace(
	wrkspaceId: string
): Promise<LinkableTarget[]> {
	const modules = await db
		.select({
			id: wrkspaceModule.id,
			type: wrkspaceModule.type,
			title: wrkspaceModule.title
		})
		.from(wrkspaceModule)
		.where(eq(wrkspaceModule.wrkspaceId, wrkspaceId))
		.orderBy(asc(wrkspaceModule.position));

	const targets: LinkableTarget[] = [];

	for (const mod of modules) {
		if (mod.type === 'tasks') {
			const tasks = await db
				.select({ id: taskItem.id, title: taskItem.title })
				.from(taskItem)
				.where(eq(taskItem.moduleId, mod.id))
				.orderBy(asc(taskItem.title));
			for (const t of tasks) {
				targets.push({
					targetType: 'task',
					targetId: t.id,
					moduleId: mod.id,
					moduleTitle: mod.title,
					title: t.title
				});
			}
		} else if (mod.type === 'docs') {
			const docs = await db
				.select({ id: docPage.id, title: docPage.title })
				.from(docPage)
				.where(eq(docPage.moduleId, mod.id))
				.orderBy(asc(docPage.title));
			for (const d of docs) {
				targets.push({
					targetType: 'doc_page',
					targetId: d.id,
					moduleId: mod.id,
					moduleTitle: mod.title,
					title: d.title
				});
			}
		} else if (mod.type === 'forum') {
			const threads = await db
				.select({ id: forumThread.id, title: forumThread.title })
				.from(forumThread)
				.where(eq(forumThread.moduleId, mod.id))
				.orderBy(desc(forumThread.updatedAt));
			for (const th of threads) {
				targets.push({
					targetType: 'forum_thread',
					targetId: th.id,
					moduleId: mod.id,
					moduleTitle: mod.title,
					title: th.title
				});
			}
		} else if (mod.type === 'decisions') {
			const decisions = await db
				.select({ id: decisionRecord.id, title: decisionRecord.title })
				.from(decisionRecord)
				.where(eq(decisionRecord.moduleId, mod.id))
				.orderBy(asc(decisionRecord.title));
			for (const d of decisions) {
				targets.push({
					targetType: 'decision',
					targetId: d.id,
					moduleId: mod.id,
					moduleTitle: mod.title,
					title: d.title
				});
			}
		}
	}

	return targets;
}
