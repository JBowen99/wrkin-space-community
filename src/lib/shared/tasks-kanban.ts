import type { TaskGroupBy, TaskPriority, TaskStatus } from './tasks';
import { TASK_PRIORITIES, TASK_STATUSES } from './tasks';
import type { TaskRow } from '$lib/server/tasks';

export type KanbanColumn = {
	id: string;
	label: string;
	tasks: TaskRow[];
};

export function buildKanbanColumns(tasks: TaskRow[], groupBy: TaskGroupBy): KanbanColumn[] {
	const keys = groupBy === 'status' ? TASK_STATUSES : TASK_PRIORITIES;
	const columns: KanbanColumn[] = keys.map((key) => ({
		id: key,
		label: key,
		tasks: []
	}));

	const byKey = new Map(columns.map((col) => [col.id, col]));

	for (const task of tasks) {
		const key = groupBy === 'status' ? task.status : task.priority;
		byKey.get(key)?.tasks.push(task);
	}

	for (const col of columns) {
		col.tasks.sort(
			(a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime()
		);
	}

	return columns;
}

export function moveTaskInKanban(
	columns: KanbanColumn[],
	taskId: string,
	targetColumnId: string,
	targetPosition: number,
	groupBy: TaskGroupBy
): KanbanColumn[] {
	const next = columns.map((col) => ({
		...col,
		tasks: [...col.tasks]
	}));

	let moved: TaskRow | undefined;
	for (const col of next) {
		const index = col.tasks.findIndex((t) => t.id === taskId);
		if (index >= 0) {
			[moved] = col.tasks.splice(index, 1);
			break;
		}
	}

	if (!moved) return columns;

	const targetCol = next.find((c) => c.id === targetColumnId);
	if (!targetCol) return columns;

	const updated: TaskRow = {
		...moved,
		...(groupBy === 'status'
			? { status: targetColumnId as TaskStatus }
			: { priority: targetColumnId as TaskPriority }),
		position: targetPosition
	};

	const pos = Math.max(0, Math.min(targetPosition, targetCol.tasks.length));
	targetCol.tasks.splice(pos, 0, updated);

	for (let i = 0; i < targetCol.tasks.length; i++) {
		targetCol.tasks[i] = { ...targetCol.tasks[i], position: i };
	}

	return next;
}

export function cloneKanbanColumns(columns: KanbanColumn[]): KanbanColumn[] {
	return columns.map((col) => ({
		...col,
		tasks: col.tasks.map((t) => ({ ...t, assignees: [...t.assignees] }))
	}));
}
