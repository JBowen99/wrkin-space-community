import { DEFAULT_PRIORITY_COLORS, DEFAULT_STATUS_COLORS } from '$lib/shared/tasks-colors';
import type { TaskPriority, TaskStatus } from '$lib/shared/tasks';

const CHART_VAR_NAMES = [
	'--color-chart-1',
	'--color-chart-2',
	'--color-chart-3',
	'--color-chart-4',
	'--color-chart-5',
	'--color-chart-6'
] as const;

const FALLBACK_SERIES = [
	'var(--color-chart-1)',
	'var(--color-chart-2)',
	'var(--color-chart-3)',
	'var(--color-chart-4)',
	'var(--color-chart-5)',
	'var(--color-chart-6)'
] as const;

export function getChartSeriesColors(): string[] {
	if (typeof document === 'undefined') return [...FALLBACK_SERIES];
	const style = getComputedStyle(document.documentElement);
	return CHART_VAR_NAMES.map((name) => style.getPropertyValue(name).trim() || 'currentColor');
}

export function chartColorAt(index: number): string {
	return FALLBACK_SERIES[index % FALLBACK_SERIES.length];
}

export function taskStatusFill(status: TaskStatus): string {
	return DEFAULT_STATUS_COLORS[status];
}

export function taskPriorityFill(priority: TaskPriority): string {
	return DEFAULT_PRIORITY_COLORS[priority];
}

export const REPORT_CHART_SEMANTIC = {
	done: 'var(--color-success)',
	open: 'var(--color-chart-1)',
	overdue: 'var(--color-danger)',
	dueSoon: 'var(--color-warning)',
	remainder: 'var(--color-ink-muted)',
	track: 'var(--color-surface-inset)'
} as const;
