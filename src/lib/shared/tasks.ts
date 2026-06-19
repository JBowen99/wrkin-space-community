export const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskGroupBy = 'status' | 'priority';

export const TASK_COLOR_BY_OPTIONS = ['status', 'priority'] as const;

export type TaskColorBy = (typeof TASK_COLOR_BY_OPTIONS)[number];

export function isTaskColorBy(value: string): value is TaskColorBy {
	return (TASK_COLOR_BY_OPTIONS as readonly string[]).includes(value);
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	backlog: 'Backlog',
	todo: 'To do',
	in_progress: 'In progress',
	review: 'Review',
	done: 'Done'
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
	low: 'Low',
	medium: 'Medium',
	high: 'High',
	urgent: 'Urgent'
};

export const DEFAULT_TASK_STATUS: TaskStatus = 'todo';
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium';

export function isTaskStatus(value: string): value is TaskStatus {
	return (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTaskPriority(value: string): value is TaskPriority {
	return (TASK_PRIORITIES as readonly string[]).includes(value);
}

export function taskStatusLabel(status: TaskStatus): string {
	return TASK_STATUS_LABELS[status];
}

export function taskPriorityLabel(priority: TaskPriority): string {
	return TASK_PRIORITY_LABELS[priority];
}

export function isTaskOpen(status: TaskStatus): boolean {
	return status !== 'done';
}

const taskDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function formatTaskDatesSummary(task: {
	startsAt: Date | null;
	endsAt?: Date | null;
	dueAt: Date | null;
	completedAt: Date | null;
}): string {
	const parts: string[] = [];
	if (task.startsAt) parts.push(`Start ${taskDateFormatter.format(task.startsAt)}`);
	if (task.endsAt) parts.push(`End ${taskDateFormatter.format(task.endsAt)}`);
	if (task.dueAt) parts.push(`Due ${taskDateFormatter.format(task.dueAt)}`);
	if (task.completedAt) parts.push(`Completed ${taskDateFormatter.format(task.completedAt)}`);
	return parts.length > 0 ? parts.join(' · ') : '—';
}

/** When status is done, keep manual completion date or set now when newly completed. */
export function resolveTaskCompletedAt(
	status: TaskStatus,
	completedAt: Date | null,
	previous?: { status: TaskStatus; completedAt: Date | null } | null
): Date | null {
	if (status !== 'done') return null;
	if (completedAt) return completedAt;
	if (previous?.status === 'done' && previous.completedAt) return previous.completedAt;
	return new Date();
}

/** Clamp task completion to 0–100 for Gantt `amountDone` and storage. */
export function clampPercentDone(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, Math.round(value)));
}
