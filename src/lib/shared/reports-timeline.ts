import type { TaskDependencyRow } from '$lib/server/tasks';
import {
	buildGanttDependencies,
	type GanttDependencyModel,
	type GanttRowModel,
	type GanttTaskModel,
	type TasksGanttData
} from './tasks-gantt';
import {
	buildTimelineEventBarHtml,
	buildTimelineTaskBarHtml,
	type TimelineGanttItem
} from './reports-timeline-content';

export type { TimelineGanttItem };

const TIMELINE_PADDING_MS = 3 * 24 * 60 * 60 * 1000;

export function buildReportTimelineGanttData(input: {
	items: TimelineGanttItem[];
	dependencies: TaskDependencyRow[];
	showDependencies: boolean;
}): { gantt: TasksGanttData; itemHrefs: Record<string, string> } {
	const { items, dependencies, showDependencies } = input;
	const itemHrefs: Record<string, string> = {};

	if (items.length === 0) {
		const now = Date.now();
		return {
			gantt: {
				rows: [],
				tasks: [],
				dependencies: [],
				from: now - TIMELINE_PADDING_MS,
				to: now + TIMELINE_PADDING_MS
			},
			itemHrefs
		};
	}

	const sorted = [...items].sort((a, b) => a.from - b.from || a.rowLabel.localeCompare(b.rowLabel));
	const rows: GanttRowModel[] = [];
	const ganttTasks: GanttTaskModel[] = [];
	let minFrom = Infinity;
	let maxTo = -Infinity;
	const itemIds = new Set<string>();

	for (const item of sorted) {
		minFrom = Math.min(minFrom, item.from);
		maxTo = Math.max(maxTo, item.to);
		itemIds.add(item.id);
		itemHrefs[item.id] = item.href;

		const isEvent = item.kind === 'event';
		const barHtml = isEvent ? buildTimelineEventBarHtml(item) : buildTimelineTaskBarHtml(item);

		rows.push({
			id: item.id,
			label: item.rowLabel,
			classes: isEvent ? ['report-timeline-event-row'] : ['report-timeline-task-row']
		});

		ganttTasks.push({
			id: item.id,
			resourceId: item.id,
			label: item.rowLabel,
			from: item.from,
			to: item.to,
			html: barHtml,
			draggable: false,
			resizable: false,
			classes: isEvent
				? ['report-timeline-event-bar', 'report-timeline-card']
				: [
						'report-timeline-task-bar',
						'report-timeline-card',
						...(item.status === 'done' ? ['task-gantt-bar-done'] : [])
					],
			color: item.color
		});
	}

	let ganttDeps: GanttDependencyModel[] = [];
	if (showDependencies) {
		const filtered = dependencies.filter(
			(d) => itemIds.has(d.fromTaskId) && itemIds.has(d.toTaskId)
		);
		ganttDeps = buildGanttDependencies(filtered);
	}

	return {
		gantt: {
			rows,
			tasks: ganttTasks,
			dependencies: ganttDeps,
			from: minFrom - TIMELINE_PADDING_MS,
			to: maxTo + TIMELINE_PADDING_MS
		},
		itemHrefs
	};
}
