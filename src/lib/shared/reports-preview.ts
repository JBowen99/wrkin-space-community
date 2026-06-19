import type { ReportType } from './reports';

export type ReportsPreviewStatusSlice = {
	status: string;
	count: number;
};

export type ReportsPreviewAssigneeBar = {
	name: string;
	open: number;
	overdue: number;
};

export type ReportsPreviewTimelineBar = {
	startPct: number;
	widthPct: number;
	kind: 'task' | 'event';
};

export type ReportsPreviewTypeCount = {
	label: string;
	count: number;
};

export type ReportsPreviewTaskLine = {
	title: string;
};

export type ReportsModulePreviewUnconfigured = {
	configured: false;
	reportType: null;
	headline: '';
	metric: null;
};

export type ReportsModulePreviewProgress = {
	configured: true;
	reportType: 'progress';
	headline: string;
	metric: number | null;
	hasSources: boolean;
	completionPercent: number;
	done: number;
	open: number;
	overdueCount: number;
	byStatus: ReportsPreviewStatusSlice[];
};

export type ReportsModulePreviewWorkload = {
	configured: true;
	reportType: 'workload';
	headline: string;
	metric: number | null;
	hasSources: boolean;
	totals: { open: number; overdue: number; dueThisWeek: number };
	byAssignee: ReportsPreviewAssigneeBar[];
};

export type ReportsModulePreviewTimeline = {
	configured: true;
	reportType: 'timeline';
	headline: string;
	metric: number | null;
	hasSources: boolean;
	taskCount: number;
	eventCount: number;
	bars: ReportsPreviewTimelineBar[];
};

export type ReportsModulePreviewPersonal = {
	configured: true;
	reportType: 'personal';
	headline: string;
	metric: number | null;
	memberName: string;
	completedCount: number;
	openCount: number;
	overdueCount: number;
	completionSparkline: number[];
	recentTasks: ReportsPreviewTaskLine[];
};

export type ReportsModulePreviewActivityDigest = {
	configured: true;
	reportType: 'activity_digest';
	headline: string;
	metric: number | null;
	dayCounts: number[];
	topTypes: ReportsPreviewTypeCount[];
};

export type ReportsModulePreviewSummary = {
	configured: true;
	reportType: 'summary';
	headline: string;
	metric: number | null;
	hasSources: boolean;
	completionPercent: number | null;
	openTasks: number | null;
	overdueCount: number | null;
	upcomingCount: number | null;
};

export type ReportsModulePreviewConfigured =
	| ReportsModulePreviewProgress
	| ReportsModulePreviewWorkload
	| ReportsModulePreviewTimeline
	| ReportsModulePreviewPersonal
	| ReportsModulePreviewActivityDigest
	| ReportsModulePreviewSummary;

export type ReportsModulePreviewData =
	| ReportsModulePreviewUnconfigured
	| ReportsModulePreviewConfigured;

export function isConfiguredReportsPreview(
	preview: ReportsModulePreviewData
): preview is ReportsModulePreviewConfigured {
	return preview.configured;
}

export function reportPreviewTypeLabel(type: ReportType): string {
	const labels: Record<ReportType, string> = {
		progress: 'Progress',
		timeline: 'Timeline',
		workload: 'Workload',
		personal: 'Personal',
		activity_digest: 'Activity',
		summary: 'Summary'
	};
	return labels[type];
}
