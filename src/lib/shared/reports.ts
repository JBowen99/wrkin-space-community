import {
	defaultReportDateRange,
	parseDatePresetFromForm,
	parseReportDateRange,
	serializeReportDateRange,
	type ReportDateRange
} from './reports-date-range';

export {
	REPORT_DATE_PRESETS,
	REPORT_DATE_PRESET_LABELS,
	defaultReportDateRange,
	isReportDatePreset,
	parseDatePresetFromForm,
	parseReportDateRange,
	resolveReportDateRange,
	serializeReportDateRange,
	type ReportDatePreset,
	type ReportDateRange
} from './reports-date-range';

export const REPORT_TYPES = [
	'progress',
	'timeline',
	'workload',
	'personal',
	'activity_digest',
	'summary'
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export function isReportType(value: string): value is ReportType {
	return (REPORT_TYPES as readonly string[]).includes(value);
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
	progress: 'Progress',
	timeline: 'Timeline',
	workload: 'Workload',
	personal: 'Personal',
	activity_digest: 'Activity digest',
	summary: 'Summary'
};

export const REPORT_TYPE_DESCRIPTIONS: Record<ReportType, string> = {
	progress: 'Roll up completion across linked task modules',
	timeline: 'Cross-module schedule with tasks and calendar events',
	workload: 'Open and overdue work by assignee across task modules',
	personal: 'One person’s completed work and contributions in a period',
	activity_digest: 'Structured “what changed” for a date range',
	summary: 'One-page stakeholder snapshot across linked modules'
};

/** Headline question each report type answers on module home. */
export const REPORT_TYPE_HEADLINES: Record<ReportType, string> = {
	progress: 'How far along are we?',
	timeline: 'What is scheduled?',
	workload: 'Who is overloaded?',
	personal: 'What did this person ship?',
	activity_digest: 'What changed?',
	summary: 'What is the executive snapshot?'
};

export const REPORT_TYPE_EMPTY_MESSAGES: Record<ReportType, string> = {
	progress: 'Link task modules and add tasks to see completion rollups.',
	timeline: 'Link task or calendar modules with dated work to populate the schedule.',
	workload: 'Link task modules with open assignments to compare load.',
	personal: 'Choose a team member and date range to see their output.',
	activity_digest: 'Activity in this wrkspace will appear once events occur in range.',
	summary: 'Enable sections and link modules to build the snapshot.'
};

export function requiresReportSourceLinks(type: ReportType): boolean {
	return type !== 'personal' && type !== 'activity_digest';
}

export function isTasksOnlyReportType(type: ReportType): boolean {
	return type === 'progress' || type === 'workload';
}

export function allowsCalendarLinks(type: ReportType): boolean {
	return type === 'timeline' || type === 'summary';
}

export type WorkloadReportConfig = {
	includeUnassigned: boolean;
};

export function defaultWorkloadReportConfig(): WorkloadReportConfig {
	return { includeUnassigned: true };
}

export function parseWorkloadConfig(raw: string | null | undefined): WorkloadReportConfig {
	const defaults = defaultWorkloadReportConfig();
	if (!raw?.trim()) return defaults;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return defaults;
		const obj = parsed as Record<string, unknown>;
		return {
			includeUnassigned: obj.includeUnassigned !== false
		};
	} catch {
		return defaults;
	}
}

export function serializeWorkloadConfig(config: WorkloadReportConfig): string {
	return JSON.stringify(config);
}

export const TIMELINE_GROUP_BY_OPTIONS = ['flat', 'module'] as const;
export type TimelineGroupBy = (typeof TIMELINE_GROUP_BY_OPTIONS)[number];

export const DEFAULT_TIMELINE_GROUP_BY: TimelineGroupBy = 'flat';

export function isTimelineGroupBy(value: string): value is TimelineGroupBy {
	return (TIMELINE_GROUP_BY_OPTIONS as readonly string[]).includes(value);
}

export type TimelineReportShow = {
	tasks: boolean;
	events: boolean;
	dependencies: boolean;
	completed: boolean;
};

export type TimelineReportFilters = {
	status?: string[];
	priority?: string[];
	assigneeIds?: string[];
};

export type TimelineReportConfig = {
	timeScale: 'week' | 'day';
	groupBy: TimelineGroupBy;
	show: TimelineReportShow;
	filters?: TimelineReportFilters;
};

export function defaultTimelineReportConfig(): TimelineReportConfig {
	return {
		timeScale: 'week',
		groupBy: 'flat',
		show: { tasks: true, events: true, dependencies: true, completed: true }
	};
}

export function parseTimelineConfig(raw: string | null | undefined): TimelineReportConfig {
	const defaults = defaultTimelineReportConfig();
	if (!raw?.trim()) return defaults;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return defaults;
		const obj = parsed as Record<string, unknown>;
		const showRaw = obj.show;
		const show: TimelineReportShow =
			showRaw && typeof showRaw === 'object'
				? {
						tasks:
							(showRaw as Record<string, unknown>).tasks !== false ? defaults.show.tasks : false,
						events:
							(showRaw as Record<string, unknown>).events !== false ? defaults.show.events : false,
						dependencies:
							(showRaw as Record<string, unknown>).dependencies !== false
								? defaults.show.dependencies
								: false,
						completed:
							(showRaw as Record<string, unknown>).completed !== false
								? defaults.show.completed
								: false
					}
				: defaults.show;

		const timeScale = obj.timeScale === 'day' ? 'day' : 'week';
		const groupBy = isTimelineGroupBy(String(obj.groupBy ?? ''))
			? (obj.groupBy as TimelineGroupBy)
			: defaults.groupBy;

		return { timeScale, groupBy, show, filters: undefined };
	} catch {
		return defaults;
	}
}

export function serializeTimelineConfig(config: TimelineReportConfig): string {
	return JSON.stringify(config);
}

export const SUMMARY_SECTIONS = ['progress', 'workload', 'upcoming', 'activity'] as const;
export type SummarySection = (typeof SUMMARY_SECTIONS)[number];

export function isSummarySection(value: string): value is SummarySection {
	return (SUMMARY_SECTIONS as readonly string[]).includes(value);
}

export type PersonalReportConfig = {
	userId: string;
	dateRange: ReportDateRange;
};

export function defaultPersonalReportConfig(userId: string): PersonalReportConfig {
	return { userId, dateRange: defaultReportDateRange('last_30_days') };
}

export function parsePersonalConfig(
	raw: string | null | undefined,
	fallbackUserId: string
): PersonalReportConfig {
	const defaults = defaultPersonalReportConfig(fallbackUserId);
	if (!raw?.trim()) return defaults;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return defaults;
		const obj = parsed as Record<string, unknown>;
		const userId =
			typeof obj.userId === 'string' && obj.userId.length > 0 ? obj.userId : fallbackUserId;
		return {
			userId,
			dateRange: parseReportDateRange(obj.dateRange)
		};
	} catch {
		return defaults;
	}
}

export function serializePersonalConfig(config: PersonalReportConfig): string {
	return JSON.stringify({
		userId: config.userId,
		dateRange: serializeReportDateRange(config.dateRange)
	});
}

export type ActivityDigestReportConfig = {
	dateRange: ReportDateRange;
	moduleType: string | null;
};

export function defaultActivityDigestReportConfig(): ActivityDigestReportConfig {
	return {
		dateRange: defaultReportDateRange('this_week'),
		moduleType: null
	};
}

export function parseActivityDigestConfig(
	raw: string | null | undefined
): ActivityDigestReportConfig {
	const defaults = defaultActivityDigestReportConfig();
	if (!raw?.trim()) return defaults;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return defaults;
		const obj = parsed as Record<string, unknown>;
		const moduleType =
			typeof obj.moduleType === 'string' && obj.moduleType.length > 0 ? obj.moduleType : null;
		return {
			dateRange: parseReportDateRange(obj.dateRange),
			moduleType
		};
	} catch {
		return defaults;
	}
}

export function serializeActivityDigestConfig(config: ActivityDigestReportConfig): string {
	return JSON.stringify({
		dateRange: serializeReportDateRange(config.dateRange),
		moduleType: config.moduleType
	});
}

export type SummaryReportConfig = {
	dateRange: ReportDateRange;
	sections: SummarySection[];
};

export function defaultSummaryReportConfig(): SummaryReportConfig {
	return {
		dateRange: defaultReportDateRange('last_7_days'),
		sections: [...SUMMARY_SECTIONS]
	};
}

export function parseSummaryConfig(raw: string | null | undefined): SummaryReportConfig {
	const defaults = defaultSummaryReportConfig();
	if (!raw?.trim()) return defaults;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return defaults;
		const obj = parsed as Record<string, unknown>;
		const sectionsRaw = obj.sections;
		const sections = Array.isArray(sectionsRaw)
			? sectionsRaw.filter((s): s is SummarySection => typeof s === 'string' && isSummarySection(s))
			: defaults.sections;
		return {
			dateRange: parseReportDateRange(obj.dateRange),
			sections: sections.length > 0 ? sections : defaults.sections
		};
	} catch {
		return defaults;
	}
}

export function serializeSummaryConfig(config: SummaryReportConfig): string {
	return JSON.stringify({
		dateRange: serializeReportDateRange(config.dateRange),
		sections: config.sections
	});
}

export type ReportConfig =
	| ProgressReportConfig
	| TimelineReportConfig
	| WorkloadReportConfig
	| PersonalReportConfig
	| ActivityDigestReportConfig
	| SummaryReportConfig;

export function parseReportConfig(
	type: ReportType,
	raw: string | null | undefined,
	options?: { fallbackUserId?: string }
): ReportConfig {
	if (type === 'timeline') return parseTimelineConfig(raw);
	if (type === 'workload') return parseWorkloadConfig(raw);
	if (type === 'personal') {
		return parsePersonalConfig(raw, options?.fallbackUserId ?? '');
	}
	if (type === 'activity_digest') return parseActivityDigestConfig(raw);
	if (type === 'summary') return parseSummaryConfig(raw);
	return parseProgressConfig(raw);
}

export function serializeReportConfig(type: ReportType, config: ReportConfig): string {
	if (type === 'timeline') return serializeTimelineConfig(config as TimelineReportConfig);
	if (type === 'workload') return serializeWorkloadConfig(config as WorkloadReportConfig);
	if (type === 'personal') return serializePersonalConfig(config as PersonalReportConfig);
	if (type === 'activity_digest') {
		return serializeActivityDigestConfig(config as ActivityDigestReportConfig);
	}
	if (type === 'summary') return serializeSummaryConfig(config as SummaryReportConfig);
	return serializeProgressConfig(config as ProgressReportConfig);
}

export function defaultReportConfigForType(
	type: ReportType,
	options?: { userId?: string }
): ReportConfig {
	if (type === 'timeline') return defaultTimelineReportConfig();
	if (type === 'workload') return defaultWorkloadReportConfig();
	if (type === 'personal') {
		return defaultPersonalReportConfig(options?.userId ?? '');
	}
	if (type === 'activity_digest') return defaultActivityDigestReportConfig();
	if (type === 'summary') return defaultSummaryReportConfig();
	return defaultProgressReportConfig();
}

export type ProgressReportFilters = {
	status?: string[];
	priority?: string[];
	assigneeIds?: string[];
};

export type ProgressReportConfig = {
	filters?: ProgressReportFilters;
	dateRange?: null;
};

export function defaultProgressReportConfig(): ProgressReportConfig {
	return {};
}

export function parseProgressConfig(raw: string | null | undefined): ProgressReportConfig {
	if (!raw?.trim()) return defaultProgressReportConfig();
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return defaultProgressReportConfig();
		const obj = parsed as Record<string, unknown>;
		const filters = obj.filters;
		if (!filters || typeof filters !== 'object') {
			return { dateRange: null };
		}
		const f = filters as Record<string, unknown>;
		return {
			filters: {
				status: Array.isArray(f.status)
					? f.status.filter((s): s is string => typeof s === 'string')
					: undefined,
				priority: Array.isArray(f.priority)
					? f.priority.filter((p): p is string => typeof p === 'string')
					: undefined,
				assigneeIds: Array.isArray(f.assigneeIds)
					? f.assigneeIds.filter((id): id is string => typeof id === 'string')
					: undefined
			},
			dateRange: null
		};
	} catch {
		return defaultProgressReportConfig();
	}
}

export function serializeProgressConfig(config: ProgressReportConfig): string {
	return JSON.stringify(config);
}

export function parseReportTypeFromForm(formData: FormData): ReportType | null {
	const raw = formData.get('reportType')?.toString() ?? '';
	return isReportType(raw) ? raw : null;
}

export function parseSourceModuleIdsFromForm(formData: FormData): string[] {
	const raw = formData.get('sourceModuleIds')?.toString() ?? '';
	if (!raw.trim()) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
	} catch {
		return [];
	}
}

export function parseSummarySectionsFromForm(formData: FormData): SummarySection[] {
	const sections: SummarySection[] = [];
	for (const section of SUMMARY_SECTIONS) {
		if (formData.has(`section_${section}`)) sections.push(section);
	}
	return sections.length > 0 ? sections : [...SUMMARY_SECTIONS];
}

export function parseModuleTypeFilterFromForm(formData: FormData): string | null {
	const raw = formData.get('moduleType')?.toString() ?? '';
	return raw.trim().length > 0 ? raw.trim() : null;
}

function parseStringArrayFromForm(formData: FormData, key: string): string[] {
	const values = formData
		.getAll(key)
		.map((v) => v.toString().trim())
		.filter(Boolean);
	return [...new Set(values)];
}

export function buildReportConfigFromForm(
	type: ReportType,
	formData: FormData,
	options: { userId: string }
): ReportConfig {
	const dateRange = { preset: parseDatePresetFromForm(formData) };

	if (type === 'personal') {
		const userId = formData.get('userId')?.toString()?.trim() || options.userId;
		return { userId, dateRange };
	}
	if (type === 'activity_digest') {
		return { dateRange, moduleType: parseModuleTypeFilterFromForm(formData) };
	}
	if (type === 'summary') {
		return { dateRange, sections: parseSummarySectionsFromForm(formData) };
	}
	if (type === 'workload') {
		return { includeUnassigned: formData.has('includeUnassigned') };
	}
	if (type === 'timeline') {
		const timeScale = formData.get('timeScale')?.toString() === 'day' ? 'day' : 'week';
		const groupByRaw = formData.get('groupBy')?.toString() ?? '';
		const groupBy = isTimelineGroupBy(groupByRaw) ? groupByRaw : DEFAULT_TIMELINE_GROUP_BY;
		return {
			timeScale,
			groupBy,
			show: {
				tasks: formData.has('show_tasks'),
				events: formData.has('show_events'),
				dependencies: formData.has('show_dependencies'),
				completed: formData.has('show_completed')
			}
		};
	}
	if (type === 'progress') {
		const status = parseStringArrayFromForm(formData, 'filter_status');
		const priority = parseStringArrayFromForm(formData, 'filter_priority');
		const filters =
			status.length > 0 || priority.length > 0
				? {
						...(status.length > 0 ? { status } : {}),
						...(priority.length > 0 ? { priority } : {})
					}
				: undefined;
		return filters ? { filters, dateRange: null } : defaultProgressReportConfig();
	}
	return defaultProgressReportConfig();
}
