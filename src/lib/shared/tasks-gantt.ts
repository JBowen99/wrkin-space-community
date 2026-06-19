import type { TaskDependencyRow, TaskRow } from '$lib/server/tasks';
import { resolveTaskColor, type TaskModuleSettingsData } from './tasks-colors';
import { clampPercentDone } from './tasks';

/** Default bar length when a task has no due date (7 days). */
const DEFAULT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_BAR_MS = 60 * 60 * 1000;
const TIMELINE_PADDING_MS = 3 * 24 * 60 * 60 * 1000;

export type GanttRowModel = {
	id: string;
	label: string;
	classes?: string[];
	/** Sidebar row HTML (svelte-gantt table renderer / headerHtml). */
	headerHtml?: string;
};

export type GanttTaskModel = {
	id: string;
	resourceId: string;
	label: string;
	from: number;
	to: number;
	draggable?: boolean;
	resizable?: boolean;
	classes?: string[];
	amountDone?: number;
	/** Rich bar markup; overrides plain label when set. */
	html?: string;
	/** Keep label visible when the bar is narrower than its text. */
	stickyLabel?: boolean;
	/** Resolved bar fill color (applied via taskElementHook). */
	color?: string;
};

export type GanttDependencyModel = {
	id: number;
	fromId: string;
	toId: string;
	/** Omit to use --sg-dependency-arrow-color from gantt.css */
	stroke?: string;
	strokeWidth: number;
	arrowSize: number;
};

export type TasksGanttData = {
	rows: GanttRowModel[];
	tasks: GanttTaskModel[];
	dependencies: GanttDependencyModel[];
	from: number;
	to: number;
};

export function buildGanttDependencies(deps: TaskDependencyRow[]): GanttDependencyModel[] {
	return deps.map((dep, index) => ({
		id: index + 1,
		fromId: dep.fromTaskId,
		toId: dep.toTaskId,
		strokeWidth: 1.5,
		arrowSize: 6
	}));
}

export function resolveTaskBarRange(task: Pick<TaskRow, 'startsAt' | 'dueAt' | 'createdAt'>): {
	from: number;
	to: number;
} {
	const from = task.startsAt?.getTime() ?? task.createdAt.getTime();
	let to = task.dueAt?.getTime() ?? from + DEFAULT_DURATION_MS;
	if (to <= from) {
		to = from + MIN_BAR_MS;
	}
	return { from, to };
}

export function buildTasksGanttData(
	tasks: TaskRow[],
	dependencies: TaskDependencyRow[],
	settings: TaskModuleSettingsData
): TasksGanttData {
	if (tasks.length === 0) {
		const now = Date.now();
		return {
			rows: [],
			tasks: [],
			dependencies: [],
			from: now - TIMELINE_PADDING_MS,
			to: now + TIMELINE_PADDING_MS
		};
	}

	const rows: GanttRowModel[] = [];
	const ganttTasks: GanttTaskModel[] = [];
	let minFrom = Infinity;
	let maxTo = -Infinity;

	for (const task of tasks) {
		const { from, to } = resolveTaskBarRange(task);
		minFrom = Math.min(minFrom, from);
		maxTo = Math.max(maxTo, to);

		rows.push({
			id: task.id,
			label: task.title,
			classes: [`task-gantt-row-${task.status}`]
		});

		const color = resolveTaskColor(task, settings);
		const percentDone = clampPercentDone(task.percentDone);
		ganttTasks.push({
			id: task.id,
			resourceId: task.id,
			label: task.title,
			from,
			to,
			draggable: true,
			resizable: true,
			classes: [
				'task-gantt-colored',
				...(percentDone > 0 ? ['task-gantt-has-progress'] : []),
				...(task.status === 'done' ? ['task-gantt-bar-done'] : [])
			],
			// svelte-gantt: amountDone drives .sg-task-background width (% complete)
			...(percentDone > 0 ? { amountDone: percentDone } : {}),
			color
		});
	}

	return {
		rows,
		tasks: ganttTasks,
		dependencies: buildGanttDependencies(dependencies),
		from: minFrom - TIMELINE_PADDING_MS,
		to: maxTo + TIMELINE_PADDING_MS
	};
}

export const GANTT_TABLE_HEADERS = [{ title: 'Task', property: 'label', width: 240 }] as const;

/** Weekend column tint; resolved from --wrkin-gantt-column-highlight in packages/theme gantt.css */
export const GANTT_WEEKEND_HIGHLIGHT = 'var(--wrkin-gantt-column-highlight)';

export type GanttTimeScale = 'week' | 'day';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
/** Max span in day view so hour columns stay readable. */
const DAY_VIEW_MAX_DAYS = 7;
const PX_PER_DAY_WEEK_VIEW = 72;
const PX_PER_HOUR_DAY_VIEW = 56;

export type GanttScaleConfig = {
	from: number;
	to: number;
	headers: { unit: string; format: string; offset?: number }[];
	columnUnit: string;
	columnOffset: number;
	minWidth: number;
	fitWidth: boolean;
	magnetUnit: string;
	magnetOffset: number;
	highlightedDurations?: { unit: string; fractions: number[] };
	highlightColor?: string;
	useCanvasColumns: boolean;
};

function startOfDay(ms: number): number {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

function endOfDay(ms: number): number {
	const d = new Date(ms);
	d.setHours(23, 59, 59, 999);
	return d.getTime();
}

/** Day view: cap range so hour columns are wide enough; pad to whole days. */
export function dayViewRange(from: number, to: number): { from: number; to: number } {
	let rangeFrom = startOfDay(from);
	let rangeTo = endOfDay(to);
	const span = rangeTo - rangeFrom;
	const maxSpan = DAY_VIEW_MAX_DAYS * DAY_MS;

	if (span > maxSpan) {
		const mid = (rangeFrom + rangeTo) / 2;
		rangeFrom = startOfDay(mid - maxSpan / 2);
		rangeTo = endOfDay(mid + maxSpan / 2);
	}

	return { from: rangeFrom, to: rangeTo };
}

function weekViewMinWidth(from: number, to: number): number {
	const days = Math.max(1, Math.ceil((to - from) / DAY_MS));
	return Math.max(900, days * PX_PER_DAY_WEEK_VIEW);
}

function dayViewMinWidth(from: number, to: number): number {
	const hours = Math.max(1, Math.ceil((to - from) / HOUR_MS));
	return Math.max(960, hours * PX_PER_HOUR_DAY_VIEW);
}

export function buildGanttScaleConfig(
	scale: GanttTimeScale,
	data: TasksGanttData
): GanttScaleConfig {
	if (scale === 'week') {
		return {
			from: data.from,
			to: data.to,
			headers: [
				{ unit: 'month', format: 'MMMM' },
				{ unit: 'day', format: 'D/M' }
			],
			columnUnit: 'day',
			columnOffset: 1,
			minWidth: weekViewMinWidth(data.from, data.to),
			fitWidth: true,
			magnetUnit: 'day',
			magnetOffset: 1,
			highlightedDurations: { unit: 'day', fractions: [0, 6] },
			highlightColor: GANTT_WEEKEND_HIGHLIGHT,
			useCanvasColumns: false
		};
	}

	const range = dayViewRange(data.from, data.to);
	return {
		from: range.from,
		to: range.to,
		headers: [
			{ unit: 'day', format: 'ddd D MMM' },
			{ unit: 'hour', format: 'HH' }
		],
		columnUnit: 'hour',
		columnOffset: 1,
		minWidth: dayViewMinWidth(range.from, range.to),
		fitWidth: false,
		magnetUnit: 'hour',
		magnetOffset: 1,
		useCanvasColumns: true
	};
}
