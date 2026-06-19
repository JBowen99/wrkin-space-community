import { listTasks, updateTask, type TaskInput } from '../tasks.ts';
import { isTaskPriority, isTaskStatus } from '../../shared/tasks';

/**
 * Editable task fields accepted by the public API surface (REST + MCP). Every
 * field is optional — only the ones provided are changed; the rest are carried
 * over from the task's current value. `updateTask` is a full replace, so this
 * helper rebuilds a complete {@link TaskInput} from the current row + overrides.
 */
export type TaskUpdateFields = {
	title?: string;
	description?: string;
	status?: string;
	priority?: string;
	dueAt?: string;
	assigneeIds?: string[];
};

/**
 * Applies a partial update to a task. Returns `false` when the task can't be
 * found, access is denied, or the underlying `updateTask` rejects (e.g. an empty
 * title). `dueAt` accepts an ISO string to set, or an empty string to clear.
 * Omitting `assigneeIds` preserves assignees; passing `[]` clears them.
 */
export async function applyTaskUpdate(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	taskId: string,
	fields: TaskUpdateFields
): Promise<boolean> {
	const tasks = await listTasks(userId, teamSlug, wrkspaceSlug, moduleId);
	const current = tasks.find((t) => t.id === taskId);
	if (!current) return false;

	const input: TaskInput = {
		title: fields.title ?? current.title,
		description: fields.description ?? current.description,
		notes: current.notes,
		status: fields.status && isTaskStatus(fields.status) ? fields.status : current.status,
		priority:
			fields.priority && isTaskPriority(fields.priority) ? fields.priority : current.priority,
		startsAt: current.startsAt,
		dueAt:
			fields.dueAt !== undefined ? (fields.dueAt ? new Date(fields.dueAt) : null) : current.dueAt,
		completedAt: current.completedAt,
		assigneeIds: fields.assigneeIds ?? current.assignees.map((a) => a.userId),
		blockedByIds: current.blockedByIds,
		percentDone: current.percentDone,
		customColor: current.customColor,
		tagIds: current.tags.map((t) => t.id),
		newTagNames: [],
		links: current.links.map((l) => ({
			targetType: l.targetType,
			targetId: l.targetId,
			moduleId: l.moduleId
		}))
	};

	return updateTask(userId, teamSlug, wrkspaceSlug, moduleId, taskId, input);
}
