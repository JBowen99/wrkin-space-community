import type { TaskRow } from '$lib/server/tasks';
import {
	TASK_PRIORITIES,
	TASK_STATUSES,
	type TaskColorBy,
	type TaskPriority,
	type TaskStatus
} from './tasks';

export type TaskColorMaps = {
	statusColors: Record<TaskStatus, string>;
	priorityColors: Record<TaskPriority, string>;
};

export type TaskModuleSettingsData = TaskColorMaps & {
	colorBy: TaskColorBy;
};

export const DEFAULT_PRIORITY_COLORS: Record<TaskPriority, string> = {
	low: '#94a3b8',
	medium: '#3b82f6',
	high: '#f59e0b',
	urgent: '#ef4444'
};

export const DEFAULT_STATUS_COLORS: Record<TaskStatus, string> = {
	backlog: '#a8a29e',
	todo: '#64748b',
	in_progress: '#3b82f6',
	review: '#8b5cf6',
	done: '#22c55e'
};

export const DEFAULT_TASK_MODULE_SETTINGS: TaskModuleSettingsData = {
	colorBy: 'priority',
	statusColors: { ...DEFAULT_STATUS_COLORS },
	priorityColors: { ...DEFAULT_PRIORITY_COLORS }
};

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: string): boolean {
	return HEX_COLOR_RE.test(value);
}

export function normalizeHexColor(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
	return isHexColor(withHash) ? withHash.toLowerCase() : null;
}

export function resolveTaskColor(
	task: Pick<TaskRow, 'status' | 'priority' | 'customColor'>,
	settings: TaskModuleSettingsData
): string {
	if (task.customColor && isHexColor(task.customColor)) {
		return task.customColor;
	}
	if (settings.colorBy === 'status') {
		return settings.statusColors[task.status] ?? DEFAULT_STATUS_COLORS[task.status];
	}
	return settings.priorityColors[task.priority] ?? DEFAULT_PRIORITY_COLORS[task.priority];
}

/** Mark a svelte-gantt task bar for CSS coloring (survives position style updates). */
export function markGanttTaskBar(node: HTMLElement, color: string): void {
	node.dataset.barColor = color;
	node.classList.add('task-gantt-colored');
}

/**
 * Styles per task bar: rounded track + `amountDone` fill via `.sg-task-background`
 * (see svelte-gantt TaskModel.amountDone).
 */
export function buildGanttTaskColorCss(colorByTaskId: Map<string, string>): string {
	const rules: string[] = [];
	for (const [taskId, color] of colorByTaskId) {
		const safeId = CSS.escape(taskId);
		rules.push(
			`.wrkin-gantt-host .sg-task[data-task-id="${safeId}"]{` +
				`background-color:color-mix(in srgb, ${color} 16%, #fff)!important;` +
				`color:#1e293b!important;overflow:hidden;border-radius:8px!important;` +
				`border:1.5px solid color-mix(in srgb, ${color} 45%, #e2e8f0)!important}` +
				`.wrkin-gantt-host .sg-task[data-task-id="${safeId}"] .sg-task-background{` +
				`background-color:color-mix(in srgb, ${color} 58%, #fff)!important;opacity:1;border-radius:8px 0 0 8px}` +
				`.wrkin-gantt-host .sg-task[data-task-id="${safeId}"] .sg-task-content{` +
				`position:relative;z-index:1;color:#1e293b!important}`
		);
	}
	return rules.join('');
}

/** Inline style for list/kanban accent borders and tints. */
export function taskAccentStyle(color: string): string {
	return `--task-accent: ${color}; border-top-color: ${color}`;
}

export function parseColorMapsJson(statusJson: string, priorityJson: string): TaskColorMaps | null {
	try {
		const statusRaw = JSON.parse(statusJson) as Record<string, string>;
		const priorityRaw = JSON.parse(priorityJson) as Record<string, string>;
		const statusColors = {} as Record<TaskStatus, string>;
		const priorityColors = {} as Record<TaskPriority, string>;

		for (const status of TASK_STATUSES) {
			const color = normalizeHexColor(statusRaw[status] ?? '');
			if (!color) return null;
			statusColors[status] = color;
		}
		for (const priority of TASK_PRIORITIES) {
			const color = normalizeHexColor(priorityRaw[priority] ?? '');
			if (!color) return null;
			priorityColors[priority] = color;
		}

		return { statusColors, priorityColors };
	} catch {
		return null;
	}
}

export function serializeColorMaps(maps: TaskColorMaps): {
	statusColors: string;
	priorityColors: string;
} {
	return {
		statusColors: JSON.stringify(maps.statusColors),
		priorityColors: JSON.stringify(maps.priorityColors)
	};
}
