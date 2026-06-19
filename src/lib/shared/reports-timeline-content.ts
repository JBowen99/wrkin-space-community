import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, isTaskPriority, isTaskStatus } from './tasks';
import { DEFAULT_PRIORITY_COLORS } from './tasks-colors';

export type TimelineAssigneeChip = {
	initials: string;
	name: string;
};

export type TimelineGanttItem = {
	id: string;
	kind: 'task' | 'event';
	title: string;
	moduleTitle: string;
	rowLabel: string;
	from: number;
	to: number;
	href: string;
	color?: string;
	status?: string;
	priority?: string;
	percentDone?: number;
	allDay?: boolean;
	assignees?: TimelineAssigneeChip[];
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

const CALENDAR_ICON = `<svg class="rt-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M5 1.5a.5.5 0 0 1 .5.5v1h5V2a.5.5 0 0 1 1 0v1h1.5A1.5 1.5 0 0 1 14 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-9A1.5 1.5 0 0 1 3.5 3H5V2a.5.5 0 0 1 .5-.5M4 6v7.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V6z"/></svg>`;

const TASK_ICON = `<svg class="rt-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2.5 2.75A.75.75 0 0 1 3.25 2h1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75.75H3.25A.75.75 0 0 1 2.5 4.25V2.75z"/><path fill="currentColor" d="M3.97 4.47 5.03 5.53 7.72 2.84l.71.71L5.03 6.95 3.26 5.18l.71-.71z"/><path fill="currentColor" d="M7.25 3.125a.375.375 0 0 0 0 .75h5.5a.375.375 0 0 0 0-.75h-5.5zM2.5 6.75A.75.75 0 0 1 3.25 6h1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75.75H3.25A.75.75 0 0 1 2.5 8.25V6.75zM7.25 7.125a.375.375 0 0 0 0 .75h5.5a.375.375 0 0 0 0-.75h-5.5zM2.5 10.75A.75.75 0 0 1 3.25 10h1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75.75H3.25A.75.75 0 0 1 2.5 12.25v-1.5zM7.25 11.125a.375.375 0 0 0 0 .75h3.5a.375.375 0 0 0 0-.75h-3.5z"/></svg>`;

function formatTime(ms: number): string {
	return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatShortDate(ms: number): string {
	return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

export function formatTimelineRange(from: number, to: number, allDay = false): string {
	const start = new Date(from);
	const end = new Date(to);
	const sameDay = start.toDateString() === end.toDateString();

	if (allDay) {
		if (sameDay) return formatShortDate(from);
		return `${formatShortDate(from)} – ${formatShortDate(to)}`;
	}

	if (sameDay) {
		return `${formatShortDate(from)} · ${formatTime(from)} – ${formatTime(to)}`;
	}

	return `${formatShortDate(from)} ${formatTime(from)} – ${formatShortDate(to)} ${formatTime(to)}`;
}

/** Card subtitle: "Jun 05 - 11:00" */
export function formatCardSchedule(from: number, to: number, allDay = false): string {
	const datePart = formatShortDate(from);
	if (allDay) {
		const endDate = formatShortDate(to);
		return datePart === endDate ? datePart : `${datePart} - ${endDate}`;
	}
	return `${datePart} - ${formatTime(from)}`;
}

export function nameInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timelineBarTooltip(item: TimelineGanttItem): string {
	const range = formatTimelineRange(item.from, item.to, item.allDay);
	if (item.kind === 'event') {
		return `${item.title} · ${item.moduleTitle} · ${range}`;
	}
	const status = taskStatusLabel(item.status);
	const priority = taskPriorityLabel(item.priority);
	const progress = item.percentDone ? ` · ${item.percentDone}%` : '';
	const assignees =
		item.assignees && item.assignees.length > 0
			? ` · ${item.assignees.map((a) => a.name).join(', ')}`
			: '';
	const priorityPart = priority ? ` · ${priority}` : '';
	return `${item.title} · ${item.moduleTitle} · ${status}${priorityPart} · ${range}${progress}${assignees}`;
}

function taskStatusLabel(status: string | undefined): string {
	if (status && isTaskStatus(status)) return TASK_STATUS_LABELS[status];
	return status ?? 'Task';
}

function taskPriorityLabel(priority: string | undefined): string | null {
	if (priority && isTaskPriority(priority)) return TASK_PRIORITY_LABELS[priority];
	return priority ?? null;
}

function priorityColor(priority: string | undefined): string {
	if (priority && isTaskPriority(priority)) {
		return DEFAULT_PRIORITY_COLORS[priority];
	}
	return DEFAULT_PRIORITY_COLORS.medium;
}

function buildAssigneeAvatars(assignees: TimelineAssigneeChip[] | undefined): string {
	if (!assignees?.length) return '';
	const chips = assignees
		.slice(0, 3)
		.map(
			(a) =>
				`<span class="rt-card__avatar" title="${escapeHtml(a.name)}">${escapeHtml(a.initials)}</span>`
		)
		.join('');
	return `<div class="rt-card__avatars">${chips}</div>`;
}

function buildPriorityBadge(priority: string | undefined): string {
	const label = taskPriorityLabel(priority);
	if (!label) return '';
	const color = priorityColor(priority);
	const safePriority = isTaskPriority(priority ?? '') ? priority : 'medium';
	return (
		`<span class="rt-card__priority rt-card__priority--${safePriority}" style="--rt-priority: ${color}">` +
		`<span class="rt-card__priority-dot" aria-hidden="true"></span>` +
		`${escapeHtml(label)}` +
		`</span>`
	);
}

export function buildTimelineTaskBarHtml(item: TimelineGanttItem): string {
	const title = escapeHtml(item.title);
	const when = escapeHtml(formatCardSchedule(item.from, item.to));
	const tooltip = escapeHtml(timelineBarTooltip(item));
	const accent = escapeHtml(item.color ?? priorityColor(item.priority));
	const progress =
		(item.percentDone ?? 0) > 0
			? `<span class="rt-card__progress">${item.percentDone}%</span>`
			: '';

	return (
		`<div class="rt-card rt-card--task" title="${tooltip}" style="--rt-accent: ${accent}">` +
		`<div class="rt-card__body">` +
		`<div class="rt-card__head">` +
		`<span class="rt-card__title">${title}</span>` +
		`<span class="rt-card__when">${when}</span>` +
		`</div>` +
		`<div class="rt-card__foot">` +
		`<div class="rt-card__badges">` +
		`<span class="rt-card__type-badge rt-card__type-badge--task">${TASK_ICON}</span>` +
		buildPriorityBadge(item.priority) +
		progress +
		`</div>` +
		buildAssigneeAvatars(item.assignees) +
		`</div>` +
		`</div>` +
		`</div>`
	);
}

export function buildTimelineEventBarHtml(item: TimelineGanttItem): string {
	const title = escapeHtml(item.title);
	const when = escapeHtml(formatCardSchedule(item.from, item.to, item.allDay));
	const moduleTitle = escapeHtml(item.moduleTitle);
	const tooltip = escapeHtml(timelineBarTooltip(item));

	return (
		`<div class="rt-card rt-card--event" title="${tooltip}" style="--rt-accent: var(--color-chart-4)">` +
		`<div class="rt-card__body">` +
		`<div class="rt-card__head">` +
		`<span class="rt-card__title">${title}</span>` +
		`<span class="rt-card__when">${when}</span>` +
		`</div>` +
		`<div class="rt-card__foot">` +
		`<div class="rt-card__badges">` +
		`<span class="rt-card__type-badge rt-card__type-badge--event">${CALENDAR_ICON}</span>` +
		`<span class="rt-card__module-chip">${moduleTitle}</span>` +
		`</div>` +
		`</div>` +
		`</div>` +
		`</div>`
	);
}
