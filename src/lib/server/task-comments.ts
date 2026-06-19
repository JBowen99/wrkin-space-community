import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './db/index.ts';
import { taskAssignee, taskComment, taskItem, user } from './db/schema.ts';
import { getModuleContext, recordActivity } from './activity.ts';
import { getModuleForUser } from './modules.ts';
import { uniqueId } from '../shared/slug';

export type TaskCommentRow = {
	id: string;
	taskId: string;
	body: string;
	authorId: string;
	authorName: string;
	authorImage: string | null;
	createdAt: Date;
};

async function assertTasksModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<boolean> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	return mod?.type === 'tasks';
}

async function assertTaskInModule(taskId: string, moduleId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: taskItem.id })
		.from(taskItem)
		.where(and(eq(taskItem.id, taskId), eq(taskItem.moduleId, moduleId)))
		.limit(1);
	return !!row;
}

async function getTaskAssigneeIds(taskId: string): Promise<string[]> {
	const rows = await db
		.select({ userId: taskAssignee.userId })
		.from(taskAssignee)
		.where(eq(taskAssignee.taskId, taskId));
	return rows.map((r) => r.userId);
}

export async function listTaskComments(taskId: string): Promise<TaskCommentRow[]> {
	return db
		.select({
			id: taskComment.id,
			taskId: taskComment.taskId,
			body: taskComment.body,
			authorId: taskComment.authorId,
			authorName: user.name,
			authorImage: user.image,
			createdAt: taskComment.createdAt
		})
		.from(taskComment)
		.innerJoin(user, eq(taskComment.authorId, user.id))
		.where(eq(taskComment.taskId, taskId))
		.orderBy(asc(taskComment.createdAt));
}

export async function loadCommentsForTasks(
	taskIds: string[]
): Promise<Map<string, TaskCommentRow[]>> {
	const map = new Map<string, TaskCommentRow[]>();
	if (taskIds.length === 0) return map;

	const rows = await db
		.select({
			id: taskComment.id,
			taskId: taskComment.taskId,
			body: taskComment.body,
			authorId: taskComment.authorId,
			authorName: user.name,
			authorImage: user.image,
			createdAt: taskComment.createdAt
		})
		.from(taskComment)
		.innerJoin(user, eq(taskComment.authorId, user.id))
		.where(inArray(taskComment.taskId, taskIds))
		.orderBy(asc(taskComment.createdAt));

	for (const row of rows) {
		const list = map.get(row.taskId) ?? [];
		list.push(row);
		map.set(row.taskId, list);
	}

	return map;
}

export async function createTaskComment(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	taskId: string,
	body: string
): Promise<string | undefined> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return undefined;
	if (!(await assertTaskInModule(taskId, moduleId))) return undefined;

	const trimmed = body.trim();
	if (!trimmed) return undefined;

	const [taskRow] = await db
		.select({ title: taskItem.title })
		.from(taskItem)
		.where(eq(taskItem.id, taskId))
		.limit(1);
	if (!taskRow) return undefined;

	const id = uniqueId();
	await db.insert(taskComment).values({
		id,
		taskId,
		authorId: userId,
		body: trimmed
	});

	const ctx = await getModuleContext(moduleId);
	if (ctx) {
		const assigneeIds = await getTaskAssigneeIds(taskId);
		await recordActivity({
			wrkspaceId: ctx.wrkspaceId,
			actorUserId: userId,
			type: 'task.commented',
			moduleId: ctx.moduleId,
			moduleType: ctx.moduleType,
			targetType: 'task',
			targetId: taskId,
			metadata: { title: taskRow.title, assigneeIds }
		});
	}

	return id;
}
