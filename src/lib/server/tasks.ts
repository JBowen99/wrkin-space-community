import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from './db/index.ts';
import {
	taskAssignee,
	taskDependency,
	taskItem,
	taskModuleSettings,
	team,
	teamMember,
	user,
	wrkspace,
	wrkspaceMember,
	wrkspaceModule
} from './db/schema.ts';
import { getModuleForUser } from './modules.ts';
import {
	DEFAULT_TASK_MODULE_SETTINGS,
	normalizeHexColor,
	parseColorMapsJson,
	serializeColorMaps,
	type TaskModuleSettingsData
} from '../shared/tasks-colors';
import {
	DEFAULT_TASK_PRIORITY,
	DEFAULT_TASK_STATUS,
	isTaskColorBy,
	isTaskPriority,
	isTaskStatus,
	clampPercentDone,
	resolveTaskCompletedAt,
	type TaskPriority,
	type TaskStatus
} from '../shared/tasks';
import { uniqueId } from '../shared/slug';
import {
	deleteAttachmentsForTask,
	loadAttachmentsForTasks,
	type TaskAttachmentRow
} from './task-attachments.ts';
import { getModuleContext, recordActivity } from './activity.ts';
import type { ActivityType } from '../shared/activity';
import type { TaskLinkInput, TaskTagRow } from '../shared/task-links';
import {
	loadCommentCountsForTasks,
	loadLinksForTasks,
	loadTagsForTasks,
	listWrkspaceTags,
	parseTaskLinksFromForm,
	replaceTaskLinks,
	replaceTaskTags,
	resolveTagIdsForWrkspace,
	validateTaskLinksInWrkspace,
	type TaskLinkRow
} from './task-tags-links.ts';
import { listLinkableTargetsForWrkspace, type LinkableTarget } from './linkable-targets.ts';
import { buildWrkspaceItemHref } from './wrkspace-links.ts';

export type { TaskAttachmentRow, TaskLinkRow, LinkableTarget };
export type { TaskCommentRow } from './task-comments.ts';
export { listTaskComments, createTaskComment, loadCommentsForTasks } from './task-comments.ts';
export { listTaskBacklinks, type TaskBacklinkRow } from './task-tags-links.ts';
export { listLinkableTargetsForWrkspace };
export { buildWrkspaceItemHref };

export type TaskAssigneeRow = {
	userId: string;
	name: string;
	image: string | null;
};

export type TaskRow = {
	id: string;
	moduleId: string;
	title: string;
	description: string;
	notes: string;
	status: TaskStatus;
	priority: TaskPriority;
	startsAt: Date | null;
	dueAt: Date | null;
	completedAt: Date | null;
	position: number;
	percentDone: number;
	customColor: string | null;
	createdAt: Date;
	updatedAt: Date;
	assignees: TaskAssigneeRow[];
	blockedByIds: string[];
	attachments: TaskAttachmentRow[];
	tags: TaskTagRow[];
	links: TaskLinkRow[];
	commentCount: number;
};

export type TaskDependencyRow = {
	id: string;
	fromTaskId: string;
	toTaskId: string;
};

export type MyTaskRow = TaskRow & {
	teamSlug: string;
	teamName: string;
	wrkspaceSlug: string;
	wrkspaceName: string;
	moduleTitle: string;
};

export type MyTaskWrkspace = {
	wrkspaceId: string;
	wrkspaceSlug: string;
	wrkspaceName: string;
	teamSlug: string;
	teamName: string;
};

export type TeamMemberOption = {
	id: string;
	name: string;
	image: string | null;
};

export type TaskInput = {
	title: string;
	description: string;
	notes: string;
	status: TaskStatus;
	priority: TaskPriority;
	startsAt: Date | null;
	dueAt: Date | null;
	completedAt: Date | null;
	assigneeIds: string[];
	blockedByIds: string[];
	percentDone: number;
	customColor: string | null;
	tagIds: string[];
	newTagNames: string[];
	links: TaskLinkInput[];
};

export type TaskModuleSettings = TaskModuleSettingsData & {
	moduleId: string;
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

async function assertWrkspaceAccess(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<{ wrkspaceId: string; teamId: string } | undefined> {
	const { getWrkspaceAccess } = await import('./authorization.ts');
	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;
	return { wrkspaceId: access.wrkspaceId, teamId: access.teamId };
}

export async function listTeamMembersForWrkspace(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<TeamMemberOption[]> {
	const access = await assertWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return [];

	const rows = await db
		.select({
			id: user.id,
			name: user.name,
			image: user.image
		})
		.from(teamMember)
		.innerJoin(user, eq(teamMember.userId, user.id))
		.where(eq(teamMember.teamId, access.teamId))
		.orderBy(asc(user.name));

	return rows;
}

async function getValidTeamMemberIds(teamId: string, assigneeIds: string[]): Promise<string[]> {
	if (assigneeIds.length === 0) return [];

	const rows = await db
		.select({ userId: teamMember.userId })
		.from(teamMember)
		.where(and(eq(teamMember.teamId, teamId), inArray(teamMember.userId, assigneeIds)));

	return rows.map((r) => r.userId);
}

async function getTeamIdForModule(moduleId: string): Promise<string | undefined> {
	const row = await db
		.select({ teamId: team.id })
		.from(wrkspaceModule)
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(wrkspaceModule.id, moduleId))
		.limit(1);
	return row[0]?.teamId;
}

async function recordTaskActivity(
	moduleId: string,
	actorUserId: string,
	type: ActivityType,
	taskId: string,
	metadata: { title: string; mentionedUserIds?: string[]; assigneeIds?: string[] }
): Promise<void> {
	const ctx = await getModuleContext(moduleId);
	if (!ctx) return;

	await recordActivity({
		wrkspaceId: ctx.wrkspaceId,
		actorUserId,
		type,
		moduleId: ctx.moduleId,
		moduleType: ctx.moduleType,
		targetType: 'task',
		targetId: taskId,
		metadata
	});
}

async function getTaskAssigneeIds(taskId: string): Promise<string[]> {
	const rows = await db
		.select({ userId: taskAssignee.userId })
		.from(taskAssignee)
		.where(eq(taskAssignee.taskId, taskId));
	return rows.map((r) => r.userId);
}

async function loadAssigneesForTasks(taskIds: string[]): Promise<Map<string, TaskAssigneeRow[]>> {
	const map = new Map<string, TaskAssigneeRow[]>();
	if (taskIds.length === 0) return map;

	const rows = await db
		.select({
			taskId: taskAssignee.taskId,
			userId: user.id,
			name: user.name,
			image: user.image
		})
		.from(taskAssignee)
		.innerJoin(user, eq(taskAssignee.userId, user.id))
		.where(inArray(taskAssignee.taskId, taskIds))
		.orderBy(asc(user.name));

	for (const row of rows) {
		const list = map.get(row.taskId) ?? [];
		list.push({ userId: row.userId, name: row.name, image: row.image });
		map.set(row.taskId, list);
	}

	return map;
}

async function loadBlockedByForTasks(taskIds: string[]): Promise<Map<string, string[]>> {
	const map = new Map<string, string[]>();
	if (taskIds.length === 0) return map;

	const rows = await db
		.select({
			toTaskId: taskDependency.toTaskId,
			fromTaskId: taskDependency.fromTaskId
		})
		.from(taskDependency)
		.where(inArray(taskDependency.toTaskId, taskIds));

	for (const row of rows) {
		const list = map.get(row.toTaskId) ?? [];
		list.push(row.fromTaskId);
		map.set(row.toTaskId, list);
	}

	return map;
}

function rowToTask(
	row: typeof taskItem.$inferSelect,
	assignees: TaskAssigneeRow[],
	blockedByIds: string[],
	attachments: TaskAttachmentRow[],
	tags: TaskTagRow[],
	links: TaskLinkRow[],
	commentCount: number
): TaskRow | null {
	if (!isTaskStatus(row.status) || !isTaskPriority(row.priority)) return null;
	const customColor = row.customColor ? normalizeHexColor(row.customColor) : null;
	return {
		id: row.id,
		moduleId: row.moduleId,
		title: row.title,
		description: row.description,
		notes: row.notes,
		status: row.status,
		priority: row.priority,
		startsAt: row.startsAt,
		dueAt: row.dueAt,
		completedAt: row.completedAt,
		position: row.position,
		percentDone: clampPercentDone(row.percentDone),
		customColor,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		assignees,
		blockedByIds,
		attachments,
		tags,
		links,
		commentCount
	};
}

function settingsRowToData(
	row: typeof taskModuleSettings.$inferSelect
): TaskModuleSettingsData | null {
	if (!isTaskColorBy(row.colorBy)) return null;
	const maps = parseColorMapsJson(row.statusColors, row.priorityColors);
	if (!maps) return null;
	return { colorBy: row.colorBy, ...maps };
}

export async function getTaskModuleSettings(moduleId: string): Promise<TaskModuleSettings> {
	const [row] = await db
		.select()
		.from(taskModuleSettings)
		.where(eq(taskModuleSettings.moduleId, moduleId))
		.limit(1);

	if (row) {
		const data = settingsRowToData(row);
		if (data) {
			return { moduleId, ...data };
		}
	}

	const defaults = DEFAULT_TASK_MODULE_SETTINGS;
	const serialized = serializeColorMaps(defaults);
	await db.insert(taskModuleSettings).values({
		moduleId,
		colorBy: defaults.colorBy,
		statusColors: serialized.statusColors,
		priorityColors: serialized.priorityColors
	});

	return { moduleId, ...defaults };
}

export async function updateTaskModuleSettings(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	data: TaskModuleSettingsData
): Promise<boolean> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;
	if (!isTaskColorBy(data.colorBy)) return false;

	const serialized = serializeColorMaps({
		statusColors: data.statusColors,
		priorityColors: data.priorityColors
	});

	await getTaskModuleSettings(moduleId);

	await db
		.update(taskModuleSettings)
		.set({
			colorBy: data.colorBy,
			statusColors: serialized.statusColors,
			priorityColors: serialized.priorityColors
		})
		.where(eq(taskModuleSettings.moduleId, moduleId));

	return true;
}

export async function listTaskDependencies(moduleId: string): Promise<TaskDependencyRow[]> {
	const taskIds = await db
		.select({ id: taskItem.id })
		.from(taskItem)
		.where(eq(taskItem.moduleId, moduleId));

	const ids = taskIds.map((t) => t.id);
	if (ids.length === 0) return [];

	const rows = await db
		.select({
			id: taskDependency.id,
			fromTaskId: taskDependency.fromTaskId,
			toTaskId: taskDependency.toTaskId
		})
		.from(taskDependency)
		.where(inArray(taskDependency.fromTaskId, ids));

	return rows.filter((r) => ids.includes(r.toTaskId));
}

async function getModuleDependencyEdges(
	moduleId: string,
	excludeEdge?: { fromTaskId: string; toTaskId: string }
): Promise<{ from: string; to: string }[]> {
	const deps = await listTaskDependencies(moduleId);
	return deps
		.filter(
			(d) =>
				!excludeEdge ||
				d.fromTaskId !== excludeEdge.fromTaskId ||
				d.toTaskId !== excludeEdge.toTaskId
		)
		.map((d) => ({ from: d.fromTaskId, to: d.toTaskId }));
}

function wouldCreateCycle(
	edges: { from: string; to: string }[],
	fromTaskId: string,
	toTaskId: string
): boolean {
	const adjacency = new Map<string, string[]>();
	for (const { from, to } of [...edges, { from: fromTaskId, to: toTaskId }]) {
		const list = adjacency.get(from) ?? [];
		list.push(to);
		adjacency.set(from, list);
	}

	const visited = new Set<string>();
	const stack = [toTaskId];

	while (stack.length > 0) {
		const current = stack.pop()!;
		if (current === fromTaskId) return true;
		if (visited.has(current)) continue;
		visited.add(current);
		const next = adjacency.get(current) ?? [];
		for (const n of next) {
			stack.push(n);
		}
	}

	return false;
}

async function validatePredecessors(
	moduleId: string,
	taskId: string,
	predecessorIds: string[]
): Promise<string[] | null> {
	const unique = [...new Set(predecessorIds.filter((id) => id && id !== taskId))];
	if (unique.length === 0) return [];

	const rows = await db
		.select({ id: taskItem.id })
		.from(taskItem)
		.where(and(eq(taskItem.moduleId, moduleId), inArray(taskItem.id, unique)));

	if (rows.length !== unique.length) return null;

	const edges = await getModuleDependencyEdges(moduleId);
	for (const fromId of unique) {
		if (wouldCreateCycle(edges, fromId, taskId)) return null;
	}

	return unique;
}

export async function replaceTaskDependencies(
	moduleId: string,
	taskId: string,
	predecessorIds: string[]
): Promise<boolean> {
	const valid = await validatePredecessors(moduleId, taskId, predecessorIds);
	if (valid === null) return false;

	await db.delete(taskDependency).where(eq(taskDependency.toTaskId, taskId));

	if (valid.length === 0) return true;

	await db.insert(taskDependency).values(
		valid.map((fromTaskId) => ({
			id: uniqueId(),
			fromTaskId,
			toTaskId: taskId
		}))
	);

	return true;
}

export async function addTaskDependency(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	fromTaskId: string,
	toTaskId: string
): Promise<{ ok: boolean; error?: string }> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return { ok: false, error: 'Module not found' };
	}

	if (fromTaskId === toTaskId) {
		return { ok: false, error: 'A task cannot depend on itself' };
	}

	const tasks = await db
		.select({ id: taskItem.id })
		.from(taskItem)
		.where(and(eq(taskItem.moduleId, moduleId), inArray(taskItem.id, [fromTaskId, toTaskId])));

	if (tasks.length !== 2) {
		return { ok: false, error: 'Tasks not found' };
	}

	const existing = await db
		.select({ id: taskDependency.id })
		.from(taskDependency)
		.where(and(eq(taskDependency.fromTaskId, fromTaskId), eq(taskDependency.toTaskId, toTaskId)))
		.limit(1);

	if (existing[0]) {
		return { ok: false, error: 'Dependency already exists' };
	}

	const edges = await getModuleDependencyEdges(moduleId);
	if (wouldCreateCycle(edges, fromTaskId, toTaskId)) {
		return { ok: false, error: 'This would create a circular dependency' };
	}

	await db.insert(taskDependency).values({
		id: uniqueId(),
		fromTaskId,
		toTaskId
	});

	return { ok: true };
}

export async function removeTaskDependency(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	fromTaskId: string,
	toTaskId: string
): Promise<boolean> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const result = await db
		.delete(taskDependency)
		.where(and(eq(taskDependency.fromTaskId, fromTaskId), eq(taskDependency.toTaskId, toTaskId)))
		.returning({ id: taskDependency.id });

	return result.length > 0;
}

export async function listTasks(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<TaskRow[]> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return [];

	const rows = await db
		.select()
		.from(taskItem)
		.where(eq(taskItem.moduleId, moduleId))
		.orderBy(asc(taskItem.position), asc(taskItem.createdAt));

	const taskIds = rows.map((r) => r.id);
	const assigneeMap = await loadAssigneesForTasks(taskIds);
	const blockedByMap = await loadBlockedByForTasks(taskIds);
	const attachmentMap = await loadAttachmentsForTasks(taskIds);
	const tagMap = await loadTagsForTasks(taskIds);
	const linkMap = await loadLinksForTasks(taskIds, teamSlug, wrkspaceSlug);
	const commentCountMap = await loadCommentCountsForTasks(taskIds);

	return rows
		.map((row) =>
			rowToTask(
				row,
				assigneeMap.get(row.id) ?? [],
				blockedByMap.get(row.id) ?? [],
				attachmentMap.get(row.id) ?? [],
				tagMap.get(row.id) ?? [],
				linkMap.get(row.id) ?? [],
				commentCountMap.get(row.id) ?? 0
			)
		)
		.filter((t): t is TaskRow => t !== null);
}

export async function listMyTasks(userId: string): Promise<{
	tasks: MyTaskRow[];
	wrkspaces: MyTaskWrkspace[];
}> {
	const rows = await db
		.select({
			taskId: taskItem.id,
			moduleId: taskItem.moduleId,
			title: taskItem.title,
			description: taskItem.description,
			notes: taskItem.notes,
			status: taskItem.status,
			priority: taskItem.priority,
			startsAt: taskItem.startsAt,
			dueAt: taskItem.dueAt,
			completedAt: taskItem.completedAt,
			position: taskItem.position,
			percentDone: taskItem.percentDone,
			customColor: taskItem.customColor,
			createdAt: taskItem.createdAt,
			updatedAt: taskItem.updatedAt,
			teamSlug: team.slug,
			teamName: team.name,
			wrkspaceSlug: wrkspace.slug,
			wrkspaceName: wrkspace.name,
			wrkspaceId: wrkspace.id,
			moduleTitle: wrkspaceModule.title
		})
		.from(taskAssignee)
		.innerJoin(taskItem, eq(taskAssignee.taskId, taskItem.id))
		.innerJoin(wrkspaceModule, eq(taskItem.moduleId, wrkspaceModule.id))
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.innerJoin(
			wrkspaceMember,
			and(eq(wrkspaceMember.wrkspaceId, wrkspace.id), eq(wrkspaceMember.userId, userId))
		)
		.where(eq(taskAssignee.userId, userId))
		.orderBy(asc(taskItem.position), asc(taskItem.createdAt));

	const taskIds = rows.map((r) => r.taskId);
	const assigneeMap = await loadAssigneesForTasks(taskIds);
	const blockedByMap = await loadBlockedByForTasks(taskIds);
	const attachmentMap = await loadAttachmentsForTasks(taskIds);
	const tagMap = await loadTagsForTasks(taskIds);
	const commentCountMap = await loadCommentCountsForTasks(taskIds);

	const tasks: MyTaskRow[] = [];
	const seenWrkspaceIds = new Set<string>();
	const wrkspaces: MyTaskWrkspace[] = [];

	for (const row of rows) {
		if (!seenWrkspaceIds.has(row.wrkspaceId)) {
			seenWrkspaceIds.add(row.wrkspaceId);
			wrkspaces.push({
				wrkspaceId: row.wrkspaceId,
				wrkspaceSlug: row.wrkspaceSlug,
				wrkspaceName: row.wrkspaceName,
				teamSlug: row.teamSlug,
				teamName: row.teamName
			});
		}

		const task = rowToTask(
			{
				id: row.taskId,
				moduleId: row.moduleId,
				title: row.title,
				description: row.description,
				notes: row.notes,
				status: row.status,
				priority: row.priority,
				startsAt: row.startsAt,
				dueAt: row.dueAt,
				completedAt: row.completedAt,
				position: row.position,
				percentDone: row.percentDone,
				customColor: row.customColor,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt
			},
			assigneeMap.get(row.taskId) ?? [],
			blockedByMap.get(row.taskId) ?? [],
			attachmentMap.get(row.taskId) ?? [],
			tagMap.get(row.taskId) ?? [],
			[],
			commentCountMap.get(row.taskId) ?? 0
		);

		if (task) {
			tasks.push({
				...task,
				teamSlug: row.teamSlug,
				teamName: row.teamName,
				wrkspaceSlug: row.wrkspaceSlug,
				wrkspaceName: row.wrkspaceName,
				moduleTitle: row.moduleTitle
			});
		}
	}

	return { tasks, wrkspaces };
}

export async function listWrkspaceTagsForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<TaskTagRow[]> {
	const access = await assertWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return [];
	return listWrkspaceTags(access.wrkspaceId);
}

export async function listLinkableTargets(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<LinkableTarget[]> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return [];
	const access = await assertWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return [];
	return listLinkableTargetsForWrkspace(access.wrkspaceId);
}

export async function resolveTaskFocusRedirect(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	taskId: string
): Promise<{ moduleId: string; taskId: string } | undefined> {
	const access = await assertWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;

	const [row] = await db
		.select({ id: taskItem.id, moduleId: taskItem.moduleId })
		.from(taskItem)
		.innerJoin(wrkspaceModule, eq(taskItem.moduleId, wrkspaceModule.id))
		.where(
			and(
				eq(taskItem.id, taskId),
				eq(wrkspaceModule.wrkspaceId, access.wrkspaceId),
				eq(wrkspaceModule.type, 'tasks')
			)
		)
		.limit(1);

	if (!row) return undefined;

	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, row.moduleId);
	if (!mod || mod.type !== 'tasks') return undefined;

	return { moduleId: row.moduleId, taskId: row.id };
}

export function buildTaskHref(
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	taskId: string
): string {
	return buildWrkspaceItemHref(teamSlug, wrkspaceSlug, 'task', moduleId, taskId);
}

async function nextTaskPosition(moduleId: string): Promise<number> {
	const [row] = await db
		.select({ maxPos: sql<number>`coalesce(max(${taskItem.position}), -1)` })
		.from(taskItem)
		.where(eq(taskItem.moduleId, moduleId));
	return Number(row?.maxPos ?? -1) + 1;
}

async function replaceAssignees(taskId: string, assigneeIds: string[]): Promise<void> {
	await db.delete(taskAssignee).where(eq(taskAssignee.taskId, taskId));
	if (assigneeIds.length === 0) return;

	await db.insert(taskAssignee).values(
		assigneeIds.map((userId) => ({
			taskId,
			userId
		}))
	);
}

async function persistTaskTagsAndLinks(
	wrkspaceId: string,
	taskId: string,
	data: TaskInput
): Promise<boolean> {
	const tagIds = await resolveTagIdsForWrkspace(wrkspaceId, data.tagIds, data.newTagNames);
	await replaceTaskTags(taskId, tagIds);

	if (!(await validateTaskLinksInWrkspace(wrkspaceId, data.links, taskId))) {
		return false;
	}
	await replaceTaskLinks(taskId, data.links);
	return true;
}

export async function createTask(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	data: TaskInput
): Promise<string | undefined> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return undefined;

	const trimmedTitle = data.title.trim();
	if (!trimmedTitle) return undefined;

	const teamId = await getTeamIdForModule(moduleId);
	if (!teamId) return undefined;

	const access = await assertWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;

	const validAssignees = await getValidTeamMemberIds(teamId, data.assigneeIds);
	const position = await nextTaskPosition(moduleId);
	const id = uniqueId();
	const now = new Date();

	await db.insert(taskItem).values({
		id,
		moduleId,
		title: trimmedTitle,
		description: data.description.trim(),
		notes: data.notes.trim(),
		status: data.status,
		priority: data.priority,
		startsAt: data.startsAt,
		dueAt: data.dueAt,
		completedAt: resolveTaskCompletedAt(data.status, data.completedAt, null),
		percentDone: data.percentDone,
		customColor: data.customColor,
		position,
		createdAt: now,
		updatedAt: now
	});

	await replaceAssignees(id, validAssignees);
	const depsOk = await replaceTaskDependencies(moduleId, id, data.blockedByIds);
	if (!depsOk) {
		await db.delete(taskItem).where(eq(taskItem.id, id));
		return undefined;
	}

	const tagsLinksOk = await persistTaskTagsAndLinks(access.wrkspaceId, id, data);
	if (!tagsLinksOk) {
		await db.delete(taskItem).where(eq(taskItem.id, id));
		return undefined;
	}

	await recordTaskActivity(moduleId, userId, 'task.created', id, {
		title: trimmedTitle,
		assigneeIds: validAssignees
	});

	return id;
}

export async function updateTask(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	taskId: string,
	data: TaskInput
): Promise<boolean> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const trimmedTitle = data.title.trim();
	if (!trimmedTitle) return false;

	const existing = await db
		.select({
			id: taskItem.id,
			status: taskItem.status,
			completedAt: taskItem.completedAt
		})
		.from(taskItem)
		.where(and(eq(taskItem.id, taskId), eq(taskItem.moduleId, moduleId)))
		.limit(1);

	if (!existing[0]) return false;

	const previousStatus = isTaskStatus(existing[0].status)
		? existing[0].status
		: DEFAULT_TASK_STATUS;
	const completedAt = resolveTaskCompletedAt(data.status, data.completedAt, {
		status: previousStatus,
		completedAt: existing[0].completedAt
	});

	const teamId = await getTeamIdForModule(moduleId);
	if (!teamId) return false;

	const access = await assertWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return false;

	const previousAssignees = await getTaskAssigneeIds(taskId);
	const validAssignees = await getValidTeamMemberIds(teamId, data.assigneeIds);
	const depsOk = await replaceTaskDependencies(moduleId, taskId, data.blockedByIds);
	if (!depsOk) return false;

	const tagsLinksOk = await persistTaskTagsAndLinks(access.wrkspaceId, taskId, data);
	if (!tagsLinksOk) return false;

	await db
		.update(taskItem)
		.set({
			title: trimmedTitle,
			description: data.description.trim(),
			notes: data.notes.trim(),
			status: data.status,
			priority: data.priority,
			startsAt: data.startsAt,
			dueAt: data.dueAt,
			completedAt,
			percentDone: data.percentDone,
			customColor: data.customColor,
			updatedAt: new Date()
		})
		.where(eq(taskItem.id, taskId));

	await replaceAssignees(taskId, validAssignees);

	const newlyCompleted = previousStatus !== 'done' && data.status === 'done';
	const newAssignees = validAssignees.filter((id) => !previousAssignees.includes(id));

	if (newlyCompleted) {
		await recordTaskActivity(moduleId, userId, 'task.completed', taskId, {
			title: trimmedTitle,
			assigneeIds: validAssignees
		});
	} else if (newAssignees.length > 0) {
		await recordTaskActivity(moduleId, userId, 'task.assigned', taskId, {
			title: trimmedTitle,
			mentionedUserIds: newAssignees
		});
	} else {
		await recordTaskActivity(moduleId, userId, 'task.updated', taskId, {
			title: trimmedTitle,
			assigneeIds: validAssignees
		});
	}

	return true;
}

export async function updateTaskSchedule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	taskId: string,
	startsAt: Date | null,
	dueAt: Date | null
): Promise<boolean> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const result = await db
		.update(taskItem)
		.set({
			startsAt,
			dueAt,
			updatedAt: new Date()
		})
		.where(and(eq(taskItem.id, taskId), eq(taskItem.moduleId, moduleId)))
		.returning({ id: taskItem.id, title: taskItem.title });

	if (result.length > 0) {
		await recordTaskActivity(moduleId, userId, 'task.updated', taskId, {
			title: result[0].title
		});
	}

	return result.length > 0;
}

export async function deleteTask(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	taskId: string
): Promise<boolean> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const existing = await db
		.select({
			id: taskItem.id,
			title: taskItem.title
		})
		.from(taskItem)
		.where(and(eq(taskItem.id, taskId), eq(taskItem.moduleId, moduleId)))
		.limit(1);

	if (!existing[0]) return false;

	const assigneeIds = await getTaskAssigneeIds(taskId);

	await deleteAttachmentsForTask(taskId);

	const result = await db
		.delete(taskItem)
		.where(and(eq(taskItem.id, taskId), eq(taskItem.moduleId, moduleId)))
		.returning({ id: taskItem.id });

	if (result.length > 0) {
		await recordTaskActivity(moduleId, userId, 'task.deleted', taskId, {
			title: existing[0].title,
			assigneeIds
		});
	}

	return result.length > 0;
}

async function rewriteTaskPositions(moduleId: string, taskIds: string[]): Promise<void> {
	for (let i = 0; i < taskIds.length; i++) {
		await db
			.update(taskItem)
			.set({ position: i, updatedAt: new Date() })
			.where(and(eq(taskItem.id, taskIds[i]), eq(taskItem.moduleId, moduleId)));
	}
}

export async function moveTask(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	taskId: string,
	targetPosition: number,
	updates?: { status?: TaskStatus; priority?: TaskPriority }
): Promise<boolean> {
	if (!(await assertTasksModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const task = await db
		.select()
		.from(taskItem)
		.where(and(eq(taskItem.id, taskId), eq(taskItem.moduleId, moduleId)))
		.limit(1);

	if (!task[0]) return false;

	const current = task[0];
	const newStatusRaw = updates?.status ?? current.status;
	const newPriority = updates?.priority ?? current.priority;

	if (updates?.status && !isTaskStatus(updates.status)) return false;
	if (updates?.priority && !isTaskPriority(updates.priority)) return false;

	const newStatus = isTaskStatus(newStatusRaw) ? newStatusRaw : DEFAULT_TASK_STATUS;
	const previousStatus = isTaskStatus(current.status) ? current.status : DEFAULT_TASK_STATUS;
	const completedAt = resolveTaskCompletedAt(newStatus, current.completedAt, {
		status: previousStatus,
		completedAt: current.completedAt
	});

	const groupField = updates?.status ? 'status' : updates?.priority ? 'priority' : null;
	const groupValue = updates?.status ?? updates?.priority ?? null;

	let peerTasks: { id: string }[];

	if (groupField === 'status' && groupValue) {
		peerTasks = await db
			.select({ id: taskItem.id })
			.from(taskItem)
			.where(and(eq(taskItem.moduleId, moduleId), eq(taskItem.status, groupValue)))
			.orderBy(asc(taskItem.position), asc(taskItem.createdAt));
	} else if (groupField === 'priority' && groupValue) {
		peerTasks = await db
			.select({ id: taskItem.id })
			.from(taskItem)
			.where(and(eq(taskItem.moduleId, moduleId), eq(taskItem.priority, groupValue)))
			.orderBy(asc(taskItem.position), asc(taskItem.createdAt));
	} else {
		peerTasks = await db
			.select({ id: taskItem.id })
			.from(taskItem)
			.where(eq(taskItem.moduleId, moduleId))
			.orderBy(asc(taskItem.position), asc(taskItem.createdAt));
	}

	const ids = peerTasks.map((t) => t.id).filter((id) => id !== taskId);
	const pos = Math.max(0, Math.min(Math.floor(targetPosition), ids.length));
	ids.splice(pos, 0, taskId);

	await db
		.update(taskItem)
		.set({
			status: newStatus,
			priority: isTaskPriority(newPriority) ? newPriority : DEFAULT_TASK_PRIORITY,
			completedAt,
			updatedAt: new Date()
		})
		.where(eq(taskItem.id, taskId));

	await rewriteTaskPositions(moduleId, ids);

	const newlyCompleted = previousStatus !== 'done' && newStatus === 'done';
	if (newlyCompleted) {
		await recordTaskActivity(moduleId, userId, 'task.completed', taskId, {
			title: current.title
		});
	} else if (updates?.status || updates?.priority) {
		await recordTaskActivity(moduleId, userId, 'task.updated', taskId, {
			title: current.title
		});
	}

	return true;
}

export const TASKS_MODULE_PREVIEW_LIMIT = 3;

export async function getTasksModulePreview(moduleId: string): Promise<{
	openCount: number;
	recent: { title: string; status: string; priority: string }[];
}> {
	const [openRow] = await db
		.select({ value: count() })
		.from(taskItem)
		.where(and(eq(taskItem.moduleId, moduleId), ne(taskItem.status, 'done')));

	const openCount = Number(openRow?.value ?? 0);

	const recent = await db
		.select({
			title: taskItem.title,
			status: taskItem.status,
			priority: taskItem.priority
		})
		.from(taskItem)
		.where(eq(taskItem.moduleId, moduleId))
		.orderBy(desc(taskItem.updatedAt), desc(taskItem.createdAt))
		.limit(TASKS_MODULE_PREVIEW_LIMIT);

	return { openCount, recent };
}

export function parseTaskInputFromForm(
	formData: FormData,
	defaults?: Partial<TaskInput>
): TaskInput | null {
	const title = formData.get('title')?.toString() ?? '';
	const description = formData.get('description')?.toString() ?? '';
	const notes = formData.get('notes')?.toString() ?? '';
	const statusRaw = formData.get('status')?.toString() ?? defaults?.status ?? DEFAULT_TASK_STATUS;
	const priorityRaw =
		formData.get('priority')?.toString() ?? defaults?.priority ?? DEFAULT_TASK_PRIORITY;

	if (!isTaskStatus(statusRaw) || !isTaskPriority(priorityRaw)) return null;

	const startsAtStr = formData.get('startsAt')?.toString() ?? '';
	const dueAtStr = formData.get('dueAt')?.toString() ?? '';

	let startsAt: Date | null = null;

	if (startsAtStr) {
		const d = new Date(startsAtStr);
		if (Number.isNaN(d.getTime())) return null;
		startsAt = d;
	}

	const completedAtStr = formData.get('completedAt')?.toString() ?? '';
	let dueAt: Date | null = null;
	let completedAt: Date | null = null;

	if (dueAtStr) {
		const d = new Date(dueAtStr);
		if (Number.isNaN(d.getTime())) return null;
		dueAt = d;
	}

	if (completedAtStr) {
		const d = new Date(completedAtStr);
		if (Number.isNaN(d.getTime())) return null;
		completedAt = d;
	}

	const assigneeIds = formData
		.getAll('assigneeIds')
		.map((v) => v.toString())
		.filter(Boolean);

	const blockedByIds = formData
		.getAll('blockedByIds')
		.map((v) => v.toString())
		.filter(Boolean);

	const customColorRaw = formData.get('customColor')?.toString() ?? '';
	const customColor = customColorRaw ? normalizeHexColor(customColorRaw) : null;
	if (customColorRaw && !customColor) return null;

	const percentRaw = formData.get('percentDone')?.toString() ?? '0';
	const percentDone = clampPercentDone(Number(percentRaw));
	if (percentRaw !== '' && Number.isNaN(Number(percentRaw))) return null;

	const tagIds = formData
		.getAll('tagIds')
		.map((v) => v.toString())
		.filter(Boolean);

	const newTagNames = formData
		.getAll('newTagNames')
		.map((v) => v.toString())
		.filter(Boolean);

	const links = parseTaskLinksFromForm(formData);

	return {
		title,
		description,
		notes,
		status: statusRaw,
		priority: priorityRaw,
		startsAt,
		dueAt,
		completedAt,
		assigneeIds,
		blockedByIds,
		percentDone,
		customColor,
		tagIds,
		newTagNames,
		links
	};
}

export function parseTaskModuleSettingsFromForm(formData: FormData): TaskModuleSettingsData | null {
	const colorByRaw = formData.get('colorBy')?.toString() ?? '';
	if (!isTaskColorBy(colorByRaw)) return null;

	const statusColors = {} as Record<TaskStatus, string>;
	const priorityColors = {} as Record<TaskPriority, string>;

	for (const [key, value] of formData.entries()) {
		if (key.startsWith('statusColor_')) {
			const status = key.slice('statusColor_'.length);
			if (!isTaskStatus(status)) continue;
			const color = normalizeHexColor(value.toString());
			if (!color) return null;
			statusColors[status] = color;
		}
		if (key.startsWith('priorityColor_')) {
			const priority = key.slice('priorityColor_'.length);
			if (!isTaskPriority(priority)) continue;
			const color = normalizeHexColor(value.toString());
			if (!color) return null;
			priorityColors[priority] = color;
		}
	}

	const maps = parseColorMapsJson(JSON.stringify(statusColors), JSON.stringify(priorityColors));
	if (!maps) return null;

	return { colorBy: colorByRaw, ...maps };
}
