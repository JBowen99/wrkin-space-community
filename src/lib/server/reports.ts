import { and, asc, count, desc, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import {
	countActivityByType,
	groupActivityByDay,
	type ActivityDayGroup
} from '../shared/reports-activity-digest';
import {
	defaultReportConfigForType,
	isReportType,
	parseActivityDigestConfig,
	parsePersonalConfig,
	parseProgressConfig,
	parseReportConfig,
	parseSummaryConfig,
	parseTimelineConfig,
	parseWorkloadConfig,
	requiresReportSourceLinks,
	resolveReportDateRange,
	serializeReportConfig,
	type ActivityDigestReportConfig,
	type PersonalReportConfig,
	type ProgressReportConfig,
	type ReportConfig,
	type ReportType,
	type SummaryReportConfig,
	type TimelineReportConfig,
	type WorkloadReportConfig
} from '../shared/reports';
import type {
	ReportsModulePreviewActivityDigest,
	ReportsModulePreviewData,
	ReportsModulePreviewPersonal,
	ReportsModulePreviewProgress,
	ReportsModulePreviewSummary,
	ReportsModulePreviewTimeline,
	ReportsModulePreviewWorkload
} from '../shared/reports-preview';
import { listWrkspaceActivityInRange } from './activity.ts';
import { getWrkspaceAccess } from './authorization.ts';
import {
	buildReportTimelineGanttData,
	type TimelineGanttItem
} from '../shared/reports-timeline';
import { nameInitials } from '../shared/reports-timeline-content';
import { resolveTaskBarRange, type TasksGanttData } from '../shared/tasks-gantt';
import {
	DEFAULT_TASK_MODULE_SETTINGS,
	resolveTaskColor,
	type TaskModuleSettingsData
} from '../shared/tasks-colors';
import {
	clampPercentDone,
	isTaskPriority,
	isTaskStatus,
	type TaskPriority,
	type TaskStatus
} from '../shared/tasks';
import { uniqueId } from '../shared/slug';
import { db } from './db/index.ts';
import {
	calendarEvent,
	reportInstance,
	reportSourceLink,
	taskAssignee,
	taskDependency,
	taskItem,
	teamMember,
	user,
	wrkspace,
	wrkspaceModule
} from './db/schema.ts';
import { getModuleForUser } from './modules.ts';
import { getTaskModuleSettings, type TaskDependencyRow } from './tasks.ts';

export type ReportSourceModuleOption = {
	id: string;
	title: string;
};

export type ReportSourceOptions = {
	taskModules: ReportSourceModuleOption[];
	calendarModules: ReportSourceModuleOption[];
};

export type ReportSourceLinkRow = {
	sourceModuleId: string;
	moduleTitle: string;
	moduleType: string;
};

export type ReportListRow = {
	id: string;
	type: ReportType;
	title: string;
	position: number;
	sourceCount: number;
	completionPercent: number | null;
	timelineItemCount: number | null;
	workloadOpenCount: number | null;
	personalCompletedCount: number | null;
	digestEventCount: number | null;
	summaryCompletionPercent: number | null;
};

export type ReportDetail = {
	id: string;
	moduleId: string;
	type: ReportType;
	title: string;
	config: ReportConfig;
	position: number;
	sourceLinks: ReportSourceLinkRow[];
};

export type TimelineReportData = {
	config: TimelineReportConfig;
	gantt: TasksGanttData;
	itemHrefs: Record<string, string>;
	itemCount: number;
};

export type WorkloadAssigneeRow = {
	userId: string | null;
	name: string;
	open: number;
	overdue: number;
	dueThisWeek: number;
};

export type WorkloadReportData = {
	config: WorkloadReportConfig;
	totals: {
		open: number;
		overdue: number;
		dueThisWeek: number;
	};
	byAssignee: WorkloadAssigneeRow[];
	maxOpen: number;
};

export type ProgressModuleBreakdown = {
	moduleId: string;
	moduleTitle: string;
	total: number;
	done: number;
	open: number;
	completionPercent: number;
	overdueCount: number;
	dueThisWeekCount: number;
};

export type ProgressStatusBreakdown = {
	status: TaskStatus;
	count: number;
};

export type ProgressPriorityBreakdown = {
	priority: TaskPriority;
	count: number;
};

export type ProgressAssigneeBreakdown = {
	userId: string;
	name: string;
	open: number;
	done: number;
};

export type ProgressReportData = {
	total: number;
	done: number;
	open: number;
	completionPercent: number;
	overdueCount: number;
	dueThisWeekCount: number;
	byModule: ProgressModuleBreakdown[];
	byStatus: ProgressStatusBreakdown[];
	byPriority: ProgressPriorityBreakdown[];
	byAssignee: ProgressAssigneeBreakdown[];
};

type TaskRowForProgress = {
	id: string;
	moduleId: string;
	status: string;
	priority: string;
	dueAt: Date | null;
};

async function assertReportsModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<{ wrkspaceId: string } | undefined> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'reports') return undefined;
	return { wrkspaceId: mod.wrkspaceId };
}

async function validateSourceModulesForReport(
	wrkspaceId: string,
	reportType: ReportType,
	sourceModuleIds: string[]
): Promise<boolean> {
	if (!requiresReportSourceLinks(reportType)) {
		return sourceModuleIds.length === 0;
	}

	if (sourceModuleIds.length === 0) return false;

	const modules = await db
		.select({ id: wrkspaceModule.id, type: wrkspaceModule.type })
		.from(wrkspaceModule)
		.where(
			and(eq(wrkspaceModule.wrkspaceId, wrkspaceId), inArray(wrkspaceModule.id, sourceModuleIds))
		);

	if (modules.length !== sourceModuleIds.length) return false;

	if (reportType === 'progress' || reportType === 'workload') {
		return modules.every((m) => m.type === 'tasks');
	}

	if (reportType === 'summary') {
		return (
			modules.some((m) => m.type === 'tasks') &&
			modules.every((m) => m.type === 'tasks' || m.type === 'calendar')
		);
	}

	return modules.every((m) => m.type === 'tasks' || m.type === 'calendar');
}

function serializeConfigForType(type: ReportType, config?: ReportConfig): string {
	const resolved = config ?? defaultReportConfigForType(type, { userId: '' });
	return serializeReportConfig(type, resolved);
}

async function listTaskModuleIdsForWrkspace(wrkspaceId: string): Promise<string[]> {
	const rows = await db
		.select({ id: wrkspaceModule.id })
		.from(wrkspaceModule)
		.where(and(eq(wrkspaceModule.wrkspaceId, wrkspaceId), eq(wrkspaceModule.type, 'tasks')))
		.orderBy(asc(wrkspaceModule.position));

	return rows.map((r) => r.id);
}

async function listCalendarModuleIdsForWrkspace(wrkspaceId: string): Promise<string[]> {
	const rows = await db
		.select({ id: wrkspaceModule.id })
		.from(wrkspaceModule)
		.where(and(eq(wrkspaceModule.wrkspaceId, wrkspaceId), eq(wrkspaceModule.type, 'calendar')))
		.orderBy(asc(wrkspaceModule.position));

	return rows.map((r) => r.id);
}

export async function resolveDefaultSourceModuleIdsForWrkspace(
	wrkspaceId: string,
	reportType: ReportType
): Promise<string[]> {
	if (!requiresReportSourceLinks(reportType)) {
		return [];
	}

	const taskIds = await listTaskModuleIdsForWrkspace(wrkspaceId);

	if (reportType === 'progress' || reportType === 'workload') {
		return taskIds;
	}

	const calendarIds = await listCalendarModuleIdsForWrkspace(wrkspaceId);
	return [...taskIds, ...calendarIds];
}

async function isUserOnTeam(teamId: string, memberUserId: string): Promise<boolean> {
	const [row] = await db
		.select({ userId: teamMember.userId })
		.from(teamMember)
		.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, memberUserId)))
		.limit(1);

	return !!row;
}

async function setReportSourceLinks(reportId: string, sourceModuleIds: string[]): Promise<void> {
	await db.delete(reportSourceLink).where(eq(reportSourceLink.reportId, reportId));

	const uniqueIds = [...new Set(sourceModuleIds)];
	if (uniqueIds.length === 0) return;

	await db.insert(reportSourceLink).values(
		uniqueIds.map((sourceModuleId) => ({
			id: uniqueId(),
			reportId,
			sourceModuleId
		}))
	);
}

async function loadSourceLinks(reportId: string): Promise<ReportSourceLinkRow[]> {
	const rows = await db
		.select({
			sourceModuleId: reportSourceLink.sourceModuleId,
			moduleTitle: wrkspaceModule.title,
			moduleType: wrkspaceModule.type
		})
		.from(reportSourceLink)
		.innerJoin(wrkspaceModule, eq(reportSourceLink.sourceModuleId, wrkspaceModule.id))
		.where(eq(reportSourceLink.reportId, reportId))
		.orderBy(asc(wrkspaceModule.position));

	return rows;
}

function dueWithinSevenDaysFrom(now: Date): Date {
	const d = new Date(now);
	d.setDate(d.getDate() + 7);
	return d;
}

function computeProgressMetrics(
	tasks: TaskRowForProgress[],
	moduleTitles: Map<string, string>
): Omit<ProgressReportData, 'byStatus' | 'byPriority' | 'byAssignee'> & {
	byModule: ProgressModuleBreakdown[];
} {
	const now = new Date();
	const weekEnd = dueWithinSevenDaysFrom(now);

	let total = 0;
	let done = 0;
	let overdueCount = 0;
	let dueThisWeekCount = 0;

	const byModuleMap = new Map<string, ProgressModuleBreakdown>();

	for (const task of tasks) {
		total++;
		const isDone = task.status === 'done';
		if (isDone) done++;

		const open = !isDone;
		if (open && task.dueAt && task.dueAt < now) overdueCount++;
		if (open && task.dueAt && task.dueAt >= now && task.dueAt < weekEnd) dueThisWeekCount++;

		let modBreakdown = byModuleMap.get(task.moduleId);
		if (!modBreakdown) {
			modBreakdown = {
				moduleId: task.moduleId,
				moduleTitle: moduleTitles.get(task.moduleId) ?? 'Tasks',
				total: 0,
				done: 0,
				open: 0,
				completionPercent: 0,
				overdueCount: 0,
				dueThisWeekCount: 0
			};
			byModuleMap.set(task.moduleId, modBreakdown);
		}

		modBreakdown.total++;
		if (isDone) modBreakdown.done++;
		else modBreakdown.open++;
		if (open && task.dueAt && task.dueAt < now) modBreakdown.overdueCount++;
		if (open && task.dueAt && task.dueAt >= now && task.dueAt < weekEnd) {
			modBreakdown.dueThisWeekCount++;
		}
	}

	const open = total - done;
	const completionPercent = total > 0 ? Math.round((done / total) * 100) : 0;

	const byModule = [...byModuleMap.values()].map((m) => ({
		...m,
		completionPercent: m.total > 0 ? Math.round((m.done / m.total) * 100) : 0
	}));

	return {
		total,
		done,
		open,
		completionPercent,
		overdueCount,
		dueThisWeekCount,
		byModule
	};
}

function taskMatchesFilters(
	task: TaskRowForProgress,
	assigneeIdsByTask: Map<string, string[]>,
	config: ProgressReportConfig
): boolean {
	const filters = config.filters;
	if (!filters) return true;

	if (filters.status?.length) {
		if (!isTaskStatus(task.status) || !filters.status.includes(task.status)) return false;
	}

	if (filters.priority?.length) {
		if (!isTaskPriority(task.priority) || !filters.priority.includes(task.priority)) return false;
	}

	if (filters.assigneeIds?.length) {
		const assignees = assigneeIdsByTask.get(task.id) ?? [];
		if (!filters.assigneeIds.some((id) => assignees.includes(id))) return false;
	}

	return true;
}

export async function listReportSourceModules(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<ReportSourceModuleOption[]> {
	const options = await listReportSourceOptions(userId, teamSlug, wrkspaceSlug, moduleId);
	return options.taskModules;
}

export async function listReportSourceOptions(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<ReportSourceOptions> {
	const ctx = await assertReportsModule(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!ctx) return { taskModules: [], calendarModules: [] };

	const rows = await db
		.select({ id: wrkspaceModule.id, title: wrkspaceModule.title, type: wrkspaceModule.type })
		.from(wrkspaceModule)
		.where(
			and(
				eq(wrkspaceModule.wrkspaceId, ctx.wrkspaceId),
				inArray(wrkspaceModule.type, ['tasks', 'calendar'])
			)
		)
		.orderBy(asc(wrkspaceModule.position));

	const taskModules: ReportSourceModuleOption[] = [];
	const calendarModules: ReportSourceModuleOption[] = [];

	for (const row of rows) {
		const entry = { id: row.id, title: row.title };
		if (row.type === 'tasks') taskModules.push(entry);
		else if (row.type === 'calendar') calendarModules.push(entry);
	}

	return { taskModules, calendarModules };
}

export async function listReports(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<ReportListRow[]> {
	if (!(await assertReportsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return [];
	}

	const rows = await db
		.select({
			id: reportInstance.id,
			type: reportInstance.type,
			title: reportInstance.title,
			position: reportInstance.position,
			config: reportInstance.config
		})
		.from(reportInstance)
		.where(eq(reportInstance.moduleId, moduleId))
		.orderBy(asc(reportInstance.position), asc(reportInstance.createdAt));

	const result: ReportListRow[] = [];

	for (const row of rows) {
		if (!isReportType(row.type)) continue;

		const [linkCount] = await db
			.select({ value: count() })
			.from(reportSourceLink)
			.where(eq(reportSourceLink.reportId, row.id));

		const sourceCount = Number(linkCount?.value ?? 0);
		let completionPercent: number | null = null;

		let timelineItemCount: number | null = null;

		if (row.type === 'progress' && sourceCount > 0) {
			const config = parseProgressConfig(row.config);
			const data = await queryProgressReportForInstance(row.id, config);
			completionPercent = data?.completionPercent ?? null;
		} else if (row.type === 'timeline' && sourceCount > 0) {
			const config = parseTimelineConfig(row.config);
			const data = await queryTimelineReportForInstance(row.id, config);
			timelineItemCount = data?.itemCount ?? null;
		}

		let workloadOpenCount: number | null = null;

		if (row.type === 'workload' && sourceCount > 0) {
			const config = parseWorkloadConfig(row.config);
			const data = await queryWorkloadReportForInstance(row.id, config);
			workloadOpenCount = data?.totals.open ?? null;
		}

		let personalCompletedCount: number | null = null;
		let digestEventCount: number | null = null;
		let summaryCompletionPercent: number | null = null;

		if (row.type === 'personal') {
			const mod = await db
				.select({ wrkspaceId: wrkspaceModule.wrkspaceId })
				.from(wrkspaceModule)
				.innerJoin(reportInstance, eq(reportInstance.moduleId, wrkspaceModule.id))
				.where(eq(reportInstance.id, row.id))
				.limit(1);
			const wrkspaceId = mod[0]?.wrkspaceId;
			if (wrkspaceId) {
				const config = parsePersonalConfig(row.config, '');
				personalCompletedCount = await countPersonalCompletedInRange(wrkspaceId, config);
			}
		} else if (row.type === 'activity_digest') {
			const mod = await db
				.select({ wrkspaceId: wrkspaceModule.wrkspaceId })
				.from(wrkspaceModule)
				.innerJoin(reportInstance, eq(reportInstance.moduleId, wrkspaceModule.id))
				.where(eq(reportInstance.id, row.id))
				.limit(1);
			const wrkspaceId = mod[0]?.wrkspaceId;
			if (wrkspaceId) {
				const config = parseActivityDigestConfig(row.config);
				digestEventCount = await countActivityDigestEvents(wrkspaceId, config);
			}
		} else if (row.type === 'summary' && sourceCount > 0) {
			const config = parseSummaryConfig(row.config);
			const data = await querySummaryReportForInstance(row.id, config);
			summaryCompletionPercent = data?.progress?.completionPercent ?? null;
		}

		result.push({
			id: row.id,
			type: row.type,
			title: row.title,
			position: row.position,
			sourceCount,
			completionPercent,
			timelineItemCount,
			workloadOpenCount,
			personalCompletedCount,
			digestEventCount,
			summaryCompletionPercent
		});
	}

	return result;
}

async function queryProgressReportForInstance(
	reportId: string,
	config: ProgressReportConfig
): Promise<ProgressReportData | null> {
	const links = await loadSourceLinks(reportId);
	const sourceIds = links.map((l) => l.sourceModuleId);
	if (sourceIds.length === 0) {
		return {
			total: 0,
			done: 0,
			open: 0,
			completionPercent: 0,
			overdueCount: 0,
			dueThisWeekCount: 0,
			byModule: [],
			byStatus: [],
			byPriority: [],
			byAssignee: []
		};
	}

	return queryProgressReport(sourceIds, config, links);
}

export async function queryProgressReport(
	sourceModuleIds: string[],
	config: ProgressReportConfig,
	sourceLinks?: ReportSourceLinkRow[]
): Promise<ProgressReportData> {
	if (sourceModuleIds.length === 0) {
		return {
			total: 0,
			done: 0,
			open: 0,
			completionPercent: 0,
			overdueCount: 0,
			dueThisWeekCount: 0,
			byModule: [],
			byStatus: [],
			byPriority: [],
			byAssignee: []
		};
	}

	const taskRows = await db
		.select({
			id: taskItem.id,
			moduleId: taskItem.moduleId,
			status: taskItem.status,
			priority: taskItem.priority,
			dueAt: taskItem.dueAt
		})
		.from(taskItem)
		.where(inArray(taskItem.moduleId, sourceModuleIds));

	const taskIds = taskRows.map((t) => t.id);
	const assigneeRows =
		taskIds.length > 0
			? await db
					.select({
						taskId: taskAssignee.taskId,
						userId: taskAssignee.userId,
						name: user.name
					})
					.from(taskAssignee)
					.innerJoin(user, eq(taskAssignee.userId, user.id))
					.where(inArray(taskAssignee.taskId, taskIds))
			: [];

	const assigneeIdsByTask = new Map<string, string[]>();
	const assigneeNames = new Map<string, string>();
	for (const row of assigneeRows) {
		const list = assigneeIdsByTask.get(row.taskId) ?? [];
		list.push(row.userId);
		assigneeIdsByTask.set(row.taskId, list);
		assigneeNames.set(row.userId, row.name);
	}

	const filtered = taskRows.filter((t) => taskMatchesFilters(t, assigneeIdsByTask, config));

	const moduleTitles = new Map<string, string>();
	if (sourceLinks) {
		for (const link of sourceLinks) {
			moduleTitles.set(link.sourceModuleId, link.moduleTitle);
		}
	} else {
		const mods = await db
			.select({ id: wrkspaceModule.id, title: wrkspaceModule.title })
			.from(wrkspaceModule)
			.where(inArray(wrkspaceModule.id, sourceModuleIds));
		for (const m of mods) moduleTitles.set(m.id, m.title);
	}

	const base = computeProgressMetrics(filtered, moduleTitles);

	const statusCounts = new Map<TaskStatus, number>();
	const priorityCounts = new Map<TaskPriority, number>();
	const assigneeOpen = new Map<string, number>();
	const assigneeDone = new Map<string, number>();

	for (const task of filtered) {
		if (isTaskStatus(task.status)) {
			statusCounts.set(task.status, (statusCounts.get(task.status) ?? 0) + 1);
		}
		if (isTaskPriority(task.priority)) {
			priorityCounts.set(task.priority, (priorityCounts.get(task.priority) ?? 0) + 1);
		}

		const assignees = assigneeIdsByTask.get(task.id) ?? [];
		const isDone = task.status === 'done';
		for (const userId of assignees) {
			if (isDone) {
				assigneeDone.set(userId, (assigneeDone.get(userId) ?? 0) + 1);
			} else if (task.status !== 'done') {
				assigneeOpen.set(userId, (assigneeOpen.get(userId) ?? 0) + 1);
			}
		}
	}

	const byStatus: ProgressStatusBreakdown[] = [...statusCounts.entries()].map(
		([status, count]) => ({
			status,
			count
		})
	);

	const byPriority: ProgressPriorityBreakdown[] = [...priorityCounts.entries()].map(
		([priority, count]) => ({ priority, count })
	);

	const assigneeIds = new Set([...assigneeOpen.keys(), ...assigneeDone.keys()]);
	const byAssignee: ProgressAssigneeBreakdown[] = [...assigneeIds].map((userId) => ({
		userId,
		name: assigneeNames.get(userId) ?? 'Unknown',
		open: assigneeOpen.get(userId) ?? 0,
		done: assigneeDone.get(userId) ?? 0
	}));

	return {
		...base,
		byStatus,
		byPriority,
		byAssignee
	};
}

async function loadReportDetailRow(
	moduleId: string,
	reportId: string,
	fallbackUserId: string
): Promise<ReportDetail | undefined> {
	const [row] = await db
		.select({
			id: reportInstance.id,
			moduleId: reportInstance.moduleId,
			type: reportInstance.type,
			title: reportInstance.title,
			config: reportInstance.config,
			position: reportInstance.position
		})
		.from(reportInstance)
		.where(and(eq(reportInstance.id, reportId), eq(reportInstance.moduleId, moduleId)))
		.limit(1);

	if (!row || !isReportType(row.type)) return undefined;

	const sourceLinks = await loadSourceLinks(reportId);

	return {
		id: row.id,
		moduleId: row.moduleId,
		type: row.type,
		title: row.title,
		config: parseReportConfig(row.type, row.config, { fallbackUserId }),
		position: row.position,
		sourceLinks
	};
}

export async function getReportForModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<ReportDetail | undefined> {
	if (!(await assertReportsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const [row] = await db
		.select({ id: reportInstance.id })
		.from(reportInstance)
		.where(eq(reportInstance.moduleId, moduleId))
		.limit(1);

	if (!row) return undefined;

	return loadReportDetailRow(moduleId, row.id, userId);
}

export async function getReport(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string
): Promise<ReportDetail | undefined> {
	if (!(await assertReportsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	return loadReportDetailRow(moduleId, reportId, userId);
}

export async function createReport(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	input: {
		type: ReportType;
		title: string;
		sourceModuleIds: string[];
		config?: ReportConfig;
	}
): Promise<string | undefined> {
	const ctx = await assertReportsModule(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!ctx) return undefined;

	const [existing] = await db
		.select({ id: reportInstance.id })
		.from(reportInstance)
		.where(eq(reportInstance.moduleId, moduleId))
		.limit(1);

	if (existing) return undefined;

	if (
		input.sourceModuleIds.length > 0 &&
		!(await validateSourceModulesForReport(ctx.wrkspaceId, input.type, input.sourceModuleIds))
	) {
		return undefined;
	}

	const id = uniqueId();
	const resolvedConfig = input.config ?? defaultReportConfigForType(input.type, { userId });
	const config = serializeReportConfig(input.type, resolvedConfig);

	await db.insert(reportInstance).values({
		id,
		moduleId,
		type: input.type,
		title: input.title.trim() || 'Untitled report',
		config,
		position: 0
	});

	await setReportSourceLinks(id, input.sourceModuleIds);
	return id;
}

export async function bootstrapReportModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	moduleTitle: string,
	reportType: ReportType
): Promise<string | undefined> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'reports') return undefined;

	const sourceModuleIds = await resolveDefaultSourceModuleIdsForWrkspace(
		mod.wrkspaceId,
		reportType
	);

	return createReport(userId, teamSlug, wrkspaceSlug, moduleId, {
		type: reportType,
		title: moduleTitle,
		sourceModuleIds
	});
}

export async function updateReport(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string,
	input: { title: string; sourceModuleIds: string[]; config?: ReportConfig }
): Promise<boolean> {
	const ctx = await assertReportsModule(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!ctx) return false;

	const existing = await getReport(userId, teamSlug, wrkspaceSlug, moduleId, reportId);
	if (!existing) return false;

	if (
		!(await validateSourceModulesForReport(ctx.wrkspaceId, existing.type, input.sourceModuleIds))
	) {
		return false;
	}

	const mergedConfig: ReportConfig = input.config ?? (existing.config as ReportConfig);
	const config = serializeConfigForType(existing.type, mergedConfig);

	await db
		.update(reportInstance)
		.set({
			title: input.title.trim() || existing.title,
			config,
			updatedAt: new Date()
		})
		.where(eq(reportInstance.id, reportId));

	await setReportSourceLinks(reportId, input.sourceModuleIds);
	return true;
}

export async function deleteReport(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string
): Promise<boolean> {
	if (!(await assertReportsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	const deleted = await db
		.delete(reportInstance)
		.where(and(eq(reportInstance.id, reportId), eq(reportInstance.moduleId, moduleId)))
		.returning({ id: reportInstance.id });

	return deleted.length > 0;
}

export async function queryWorkloadReport(
	sourceModuleIds: string[],
	config: WorkloadReportConfig
): Promise<WorkloadReportData> {
	const empty: WorkloadReportData = {
		config,
		totals: { open: 0, overdue: 0, dueThisWeek: 0 },
		byAssignee: [],
		maxOpen: 0
	};

	if (sourceModuleIds.length === 0) return empty;

	const now = new Date();
	const weekEnd = dueWithinSevenDaysFrom(now);

	const taskRows = await db
		.select({
			id: taskItem.id,
			status: taskItem.status,
			dueAt: taskItem.dueAt
		})
		.from(taskItem)
		.where(and(inArray(taskItem.moduleId, sourceModuleIds), ne(taskItem.status, 'done')));

	const taskIds = taskRows.map((t) => t.id);
	const assigneeRows =
		taskIds.length > 0
			? await db
					.select({
						taskId: taskAssignee.taskId,
						userId: taskAssignee.userId,
						name: user.name
					})
					.from(taskAssignee)
					.innerJoin(user, eq(taskAssignee.userId, user.id))
					.where(inArray(taskAssignee.taskId, taskIds))
			: [];

	const assigneesByTask = new Map<string, { userId: string; name: string }[]>();
	for (const row of assigneeRows) {
		const list = assigneesByTask.get(row.taskId) ?? [];
		list.push({ userId: row.userId, name: row.name });
		assigneesByTask.set(row.taskId, list);
	}

	const buckets = new Map<string, WorkloadAssigneeRow>();

	function getBucket(userId: string | null, name: string): WorkloadAssigneeRow {
		const key = userId ?? '__unassigned__';
		let row = buckets.get(key);
		if (!row) {
			row = { userId, name, open: 0, overdue: 0, dueThisWeek: 0 };
			buckets.set(key, row);
		}
		return row;
	}

	let totalsOpen = 0;
	let totalsOverdue = 0;
	let totalsDueWeek = 0;

	for (const task of taskRows) {
		totalsOpen++;
		const overdue = !!task.dueAt && task.dueAt < now;
		const dueWeek = !!task.dueAt && task.dueAt >= now && task.dueAt < weekEnd;
		if (overdue) totalsOverdue++;
		if (dueWeek) totalsDueWeek++;

		const assignees = assigneesByTask.get(task.id) ?? [];

		if (assignees.length === 0) {
			if (!config.includeUnassigned) continue;
			const bucket = getBucket(null, 'Unassigned');
			bucket.open++;
			if (overdue) bucket.overdue++;
			if (dueWeek) bucket.dueThisWeek++;
			continue;
		}

		for (const assignee of assignees) {
			const bucket = getBucket(assignee.userId, assignee.name);
			bucket.open++;
			if (overdue) bucket.overdue++;
			if (dueWeek) bucket.dueThisWeek++;
		}
	}

	const byAssignee = [...buckets.values()].sort((a, b) => {
		if (a.userId === null) return 1;
		if (b.userId === null) return -1;
		return b.open - a.open || a.name.localeCompare(b.name);
	});

	const maxOpen = byAssignee.reduce((max, row) => Math.max(max, row.open), 0);

	return {
		config,
		totals: {
			open: totalsOpen,
			overdue: totalsOverdue,
			dueThisWeek: totalsDueWeek
		},
		byAssignee,
		maxOpen
	};
}

async function queryWorkloadReportForInstance(
	reportId: string,
	config: WorkloadReportConfig
): Promise<WorkloadReportData | null> {
	const links = await loadSourceLinks(reportId);
	const taskModuleIds = links.filter((l) => l.moduleType === 'tasks').map((l) => l.sourceModuleId);
	return queryWorkloadReport(taskModuleIds, config);
}

export async function getWorkloadReportData(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string
): Promise<WorkloadReportData | undefined> {
	const report = await getReport(userId, teamSlug, wrkspaceSlug, moduleId, reportId);
	if (!report || report.type !== 'workload') return undefined;

	const taskModuleIds = report.sourceLinks
		.filter((l) => l.moduleType === 'tasks')
		.map((l) => l.sourceModuleId);

	return queryWorkloadReport(taskModuleIds, report.config as WorkloadReportConfig);
}

export async function getProgressReportData(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string
): Promise<ProgressReportData | undefined> {
	const report = await getReport(userId, teamSlug, wrkspaceSlug, moduleId, reportId);
	if (!report || report.type !== 'progress') return undefined;

	const sourceIds = report.sourceLinks.map((l) => l.sourceModuleId);
	return queryProgressReport(sourceIds, report.config as ProgressReportConfig, report.sourceLinks);
}

const MIN_EVENT_BAR_MS = 60 * 60 * 1000;

function buildTaskItemHref(
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	taskId: string
): string {
	return `/teams/${teamSlug}/wrkspaces/${wrkspaceSlug}/modules/${moduleId}?task=${taskId}`;
}

function buildCalendarModuleHref(teamSlug: string, wrkspaceSlug: string, moduleId: string): string {
	return `/teams/${teamSlug}/wrkspaces/${wrkspaceSlug}/modules/${moduleId}`;
}

function resolveEventBarRange(startsAt: Date, endsAt: Date | null): { from: number; to: number } {
	const from = startsAt.getTime();
	let to = endsAt?.getTime() ?? from + MIN_EVENT_BAR_MS;
	if (to <= from) to = from + MIN_EVENT_BAR_MS;
	return { from, to };
}

async function loadSettingsByModule(
	taskModuleIds: string[]
): Promise<Map<string, TaskModuleSettingsData>> {
	const map = new Map<string, TaskModuleSettingsData>();
	for (const moduleId of taskModuleIds) {
		const settings = await getTaskModuleSettings(moduleId);
		map.set(moduleId, {
			colorBy: settings.colorBy,
			statusColors: settings.statusColors,
			priorityColors: settings.priorityColors
		});
	}
	return map;
}

async function queryTimelineReportForInstance(
	reportId: string,
	config: TimelineReportConfig,
	teamSlug?: string,
	wrkspaceSlug?: string
): Promise<TimelineReportData | null> {
	const links = await loadSourceLinks(reportId);
	return queryTimelineReport(links, config, teamSlug, wrkspaceSlug);
}

export async function queryTimelineReport(
	sourceLinks: ReportSourceLinkRow[],
	config: TimelineReportConfig,
	teamSlug?: string,
	wrkspaceSlug?: string
): Promise<TimelineReportData> {
	const taskModuleIds = sourceLinks
		.filter((l) => l.moduleType === 'tasks')
		.map((l) => l.sourceModuleId);
	const calendarModuleIds = sourceLinks
		.filter((l) => l.moduleType === 'calendar')
		.map((l) => l.sourceModuleId);

	const moduleTitleById = new Map(sourceLinks.map((l) => [l.sourceModuleId, l.moduleTitle]));

	const items: TimelineGanttItem[] = [];
	const settingsByModule = await loadSettingsByModule(taskModuleIds);

	if (config.show.tasks && taskModuleIds.length > 0) {
		const taskRows = await db
			.select()
			.from(taskItem)
			.where(inArray(taskItem.moduleId, taskModuleIds));

		const taskIds = taskRows.map((t) => t.id);
		const assigneeRows =
			taskIds.length > 0
				? await db
						.select({ taskId: taskAssignee.taskId, userId: taskAssignee.userId })
						.from(taskAssignee)
						.where(inArray(taskAssignee.taskId, taskIds))
				: [];
		const assigneeIdsByTask = new Map<string, string[]>();
		for (const row of assigneeRows) {
			const list = assigneeIdsByTask.get(row.taskId) ?? [];
			list.push(row.userId);
			assigneeIdsByTask.set(row.taskId, list);
		}

		const assigneeUserIds = [...new Set(assigneeRows.map((r) => r.userId))];
		const assigneeNameByUserId = new Map<string, string>();
		if (assigneeUserIds.length > 0) {
			const users = await db
				.select({ id: user.id, name: user.name })
				.from(user)
				.where(inArray(user.id, assigneeUserIds));
			for (const u of users) {
				assigneeNameByUserId.set(u.id, u.name);
			}
		}

		for (const row of taskRows) {
			if (!isTaskStatus(row.status) || !isTaskPriority(row.priority)) continue;
			if (!config.show.completed && row.status === 'done') continue;

			const progressTask = {
				id: row.id,
				moduleId: row.moduleId,
				status: row.status,
				priority: row.priority,
				dueAt: row.dueAt
			};
			if (!taskMatchesTimelineFilters(progressTask, assigneeIdsByTask, config)) continue;

			const settings = settingsByModule.get(row.moduleId) ?? DEFAULT_TASK_MODULE_SETTINGS;
			const taskForColor = {
				id: row.id,
				moduleId: row.moduleId,
				title: row.title,
				description: row.description,
				notes: row.notes,
				status: row.status,
				priority: row.priority,
				startsAt: row.startsAt,
				dueAt: row.dueAt,
				completedAt: row.completedAt,
				position: row.position,
				percentDone: clampPercentDone(row.percentDone),
				customColor: row.customColor,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				assignees: [],
				blockedByIds: [],
				attachments: [],
				tags: [],
				links: [],
				commentCount: 0
			};
			const { from, to } = resolveTaskBarRange(taskForColor);
			const modTitle = moduleTitleById.get(row.moduleId) ?? 'Tasks';
			const rowLabel = config.groupBy === 'module' ? row.title : `${row.title} · ${modTitle}`;
			const href =
				teamSlug && wrkspaceSlug
					? buildTaskItemHref(teamSlug, wrkspaceSlug, row.moduleId, row.id)
					: '#';

			const assigneeChips = (assigneeIdsByTask.get(row.id) ?? []).slice(0, 3).map((userId) => {
				const name = assigneeNameByUserId.get(userId) ?? 'Unknown';
				return { initials: nameInitials(name), name };
			});

			items.push({
				id: row.id,
				kind: 'task',
				title: row.title,
				moduleTitle: modTitle,
				rowLabel,
				from,
				to,
				href,
				color: resolveTaskColor(taskForColor, settings),
				status: row.status,
				priority: row.priority,
				percentDone: clampPercentDone(row.percentDone),
				assignees: assigneeChips
			});
		}
	}

	if (config.show.events && calendarModuleIds.length > 0) {
		const events = await db
			.select()
			.from(calendarEvent)
			.where(inArray(calendarEvent.moduleId, calendarModuleIds))
			.orderBy(asc(calendarEvent.startsAt));

		for (const event of events) {
			const { from, to } = resolveEventBarRange(event.startsAt, event.endsAt);
			const modTitle = moduleTitleById.get(event.moduleId) ?? 'Calendar';
			const rowLabel = config.groupBy === 'module' ? event.title : `${event.title} · ${modTitle}`;
			const href =
				teamSlug && wrkspaceSlug
					? buildCalendarModuleHref(teamSlug, wrkspaceSlug, event.moduleId)
					: '#';

			items.push({
				id: `event-${event.id}`,
				kind: 'event',
				title: event.title,
				moduleTitle: modTitle,
				rowLabel,
				from,
				to,
				href
			});
		}
	}

	let dependencies: TaskDependencyRow[] = [];
	if (config.show.dependencies && taskModuleIds.length > 0) {
		const depRows = await db
			.select({
				id: taskDependency.id,
				fromTaskId: taskDependency.fromTaskId,
				toTaskId: taskDependency.toTaskId
			})
			.from(taskDependency)
			.innerJoin(taskItem, eq(taskDependency.fromTaskId, taskItem.id))
			.where(inArray(taskItem.moduleId, taskModuleIds));

		dependencies = depRows;
	}

	const { gantt, itemHrefs } = buildReportTimelineGanttData({
		items,
		dependencies,
		showDependencies: config.show.dependencies
	});

	return {
		config,
		gantt,
		itemHrefs,
		itemCount: items.length
	};
}

function taskMatchesTimelineFilters(
	task: { id: string; status: string; priority: string },
	assigneeIdsByTask: Map<string, string[]>,
	config: TimelineReportConfig
): boolean {
	const filters = config.filters;
	if (!filters) return true;

	if (filters.status?.length) {
		if (!isTaskStatus(task.status) || !filters.status.includes(task.status)) return false;
	}
	if (filters.priority?.length) {
		if (!isTaskPriority(task.priority) || !filters.priority.includes(task.priority)) return false;
	}
	if (filters.assigneeIds?.length) {
		const assignees = assigneeIdsByTask.get(task.id) ?? [];
		if (!filters.assigneeIds.some((id) => assignees.includes(id))) return false;
	}
	return true;
}

export async function getTimelineReportData(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string
): Promise<TimelineReportData | undefined> {
	const report = await getReport(userId, teamSlug, wrkspaceSlug, moduleId, reportId);
	if (!report || report.type !== 'timeline') return undefined;

	return queryTimelineReport(
		report.sourceLinks,
		report.config as TimelineReportConfig,
		teamSlug,
		wrkspaceSlug
	);
}

export function buildReportHref(
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string
): string {
	return `/teams/${teamSlug}/wrkspaces/${wrkspaceSlug}/modules/${moduleId}/reports/${reportId}`;
}

export function buildTasksModuleHref(
	teamSlug: string,
	wrkspaceSlug: string,
	sourceModuleId: string
): string {
	return `/teams/${teamSlug}/wrkspaces/${wrkspaceSlug}/modules/${sourceModuleId}`;
}

export type ReportsModuleViewData = {
	report: ReportDetail;
	sourceOptions: ReportSourceOptions;
	progressData: ProgressReportData | null;
	timelineData: TimelineReportData | null;
	workloadData: WorkloadReportData | null;
	personalData: PersonalReportData | null;
	digestData: ActivityDigestReportData | null;
	summaryData: SummaryReportData | null;
	moduleLinks: { moduleId: string; moduleTitle: string; href: string }[];
	digestModuleTypeLabel: string | null;
};

export async function loadReportsModuleViewData(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<ReportsModuleViewData | undefined> {
	const report = await getReportForModule(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!report) return undefined;

	const reportId = report.id;

	const [
		sourceOptions,
		progressData,
		timelineData,
		workloadData,
		personalData,
		digestData,
		summaryData
	] = await Promise.all([
		listReportSourceOptions(userId, teamSlug, wrkspaceSlug, moduleId),
		report.type === 'progress'
			? getProgressReportData(userId, teamSlug, wrkspaceSlug, moduleId, reportId)
			: Promise.resolve(null),
		report.type === 'timeline'
			? getTimelineReportData(userId, teamSlug, wrkspaceSlug, moduleId, reportId)
			: Promise.resolve(null),
		report.type === 'workload'
			? getWorkloadReportData(userId, teamSlug, wrkspaceSlug, moduleId, reportId)
			: Promise.resolve(null),
		report.type === 'personal'
			? getPersonalReportData(userId, teamSlug, wrkspaceSlug, moduleId, reportId)
			: Promise.resolve(null),
		report.type === 'activity_digest'
			? getActivityDigestReportData(userId, teamSlug, wrkspaceSlug, moduleId, reportId)
			: Promise.resolve(null),
		report.type === 'summary'
			? getSummaryReportData(userId, teamSlug, wrkspaceSlug, moduleId, reportId)
			: Promise.resolve(null)
	]);

	const moduleLinks =
		progressData && report.type === 'progress'
			? report.sourceLinks.map((link) => ({
					moduleId: link.sourceModuleId,
					moduleTitle: link.moduleTitle,
					href: buildTasksModuleHref(teamSlug, wrkspaceSlug, link.sourceModuleId)
				}))
			: [];

	const digestModuleType =
		report.type === 'activity_digest'
			? (report.config as ActivityDigestReportConfig).moduleType
			: null;

	const { getModuleCatalogEntry, isModuleType } = await import('$lib/shared/modules');
	const digestModuleTypeLabel =
		digestModuleType && isModuleType(digestModuleType)
			? getModuleCatalogEntry(digestModuleType).label
			: null;

	return {
		report,
		sourceOptions,
		progressData: progressData ?? null,
		timelineData: timelineData ?? null,
		workloadData: workloadData ?? null,
		personalData: personalData ?? null,
		digestData: digestData ?? null,
		summaryData: summaryData ?? null,
		moduleLinks,
		digestModuleTypeLabel
	};
}

export type {
	ReportsModulePreviewData,
	ReportsModulePreviewConfigured,
	ReportsModulePreviewProgress,
	ReportsModulePreviewWorkload,
	ReportsModulePreviewTimeline,
	ReportsModulePreviewPersonal,
	ReportsModulePreviewActivityDigest,
	ReportsModulePreviewSummary
} from '../shared/reports-preview';

async function loadModuleWrkspaceContext(
	moduleId: string
): Promise<{ wrkspaceId: string; teamId: string } | undefined> {
	const [row] = await db
		.select({ wrkspaceId: wrkspaceModule.wrkspaceId, teamId: wrkspace.teamId })
		.from(wrkspaceModule)
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.where(eq(wrkspaceModule.id, moduleId))
		.limit(1);

	return row;
}

function formatActivityTypeLabel(type: string): string {
	return type.replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTimelinePreviewBars(data: TimelineReportData): ReportsModulePreviewTimeline['bars'] {
	const rangeStart = data.gantt.from;
	const rangeEnd = data.gantt.to;
	const span = Math.max(rangeEnd - rangeStart, 1);

	return data.gantt.tasks.slice(0, 5).map((task) => ({
		startPct: ((task.from - rangeStart) / span) * 100,
		widthPct: Math.max(((task.to - task.from) / span) * 100, 3),
		kind: task.classes?.includes('report-timeline-event-bar') ? 'event' : 'task'
	}));
}

export async function getReportsModulePreview(moduleId: string): Promise<ReportsModulePreviewData> {
	const [row] = await db
		.select({
			id: reportInstance.id,
			type: reportInstance.type,
			config: reportInstance.config
		})
		.from(reportInstance)
		.where(eq(reportInstance.moduleId, moduleId))
		.limit(1);

	if (!row || !isReportType(row.type)) {
		return { configured: false, reportType: null, headline: '', metric: null };
	}

	const [linkCount] = await db
		.select({ value: count() })
		.from(reportSourceLink)
		.where(eq(reportSourceLink.reportId, row.id));

	const sourceCount = Number(linkCount?.value ?? 0);
	const hasSources = sourceCount > 0;

	if (row.type === 'progress') {
		const config = parseProgressConfig(row.config);
		const data = hasSources ? await queryProgressReportForInstance(row.id, config) : null;
		const completionPercent = data?.completionPercent ?? 0;
		const preview: ReportsModulePreviewProgress = {
			configured: true,
			reportType: 'progress',
			metric: hasSources ? completionPercent : null,
			headline: !hasSources
				? 'Link task modules'
				: data && data.total > 0
					? `${completionPercent}% complete`
					: 'No tasks yet',
			hasSources,
			completionPercent,
			done: data?.done ?? 0,
			open: data?.open ?? 0,
			overdueCount: data?.overdueCount ?? 0,
			byStatus: (data?.byStatus ?? []).slice(0, 4).map((entry) => ({
				status: entry.status,
				count: entry.count
			}))
		};
		return preview;
	}

	if (row.type === 'workload') {
		const config = parseWorkloadConfig(row.config);
		const data = hasSources ? await queryWorkloadReportForInstance(row.id, config) : null;
		const preview: ReportsModulePreviewWorkload = {
			configured: true,
			reportType: 'workload',
			metric: data?.totals.open ?? null,
			headline: !hasSources
				? 'Link task modules'
				: data && data.totals.open > 0
					? `${data.totals.open} open`
					: 'No open tasks',
			hasSources,
			totals: data?.totals ?? { open: 0, overdue: 0, dueThisWeek: 0 },
			byAssignee: (data?.byAssignee ?? []).slice(0, 3).map((entry) => ({
				name: entry.name,
				open: entry.open,
				overdue: entry.overdue
			}))
		};
		return preview;
	}

	if (row.type === 'timeline') {
		const config = parseTimelineConfig(row.config);
		const data = hasSources ? await queryTimelineReportForInstance(row.id, config) : null;
		const taskCount =
			data?.gantt.tasks.filter((task) => task.classes?.includes('report-timeline-task-bar'))
				.length ?? 0;
		const eventCount =
			data?.gantt.tasks.filter((task) => task.classes?.includes('report-timeline-event-bar'))
				.length ?? 0;
		const itemCount = data?.itemCount ?? 0;
		const preview: ReportsModulePreviewTimeline = {
			configured: true,
			reportType: 'timeline',
			metric: hasSources ? itemCount : null,
			headline: !hasSources
				? 'Link modules'
				: itemCount > 0
					? `${itemCount} scheduled`
					: 'Nothing scheduled',
			hasSources,
			taskCount,
			eventCount,
			bars: data ? buildTimelinePreviewBars(data) : []
		};
		return preview;
	}

	if (row.type === 'personal') {
		const ctx = await loadModuleWrkspaceContext(moduleId);
		const config = parsePersonalConfig(row.config, '');
		let memberName = 'Team member';
		let completedCount = 0;
		let openCount = 0;
		let overdueCount = 0;
		let completionSparkline: number[] = [];
		let recentTasks: ReportsModulePreviewPersonal['recentTasks'] = [];

		if (ctx) {
			const data = await queryPersonalReport(ctx.wrkspaceId, ctx.teamId, config);
			memberName = data.memberName;
			completedCount = data.completedInRange.length;
			openCount = data.openAssigned.length;
			overdueCount = data.overdueAssigned.length;
			completionSparkline = data.completedByDay.slice(-7).map((day) => day.count);
			recentTasks = data.completedInRange.slice(0, 2).map((task) => ({ title: task.title }));
		}

		const preview: ReportsModulePreviewPersonal = {
			configured: true,
			reportType: 'personal',
			metric: completedCount,
			headline: `${completedCount} completed`,
			memberName,
			completedCount,
			openCount,
			overdueCount,
			completionSparkline,
			recentTasks
		};
		return preview;
	}

	if (row.type === 'activity_digest') {
		const ctx = await loadModuleWrkspaceContext(moduleId);
		const config = parseActivityDigestConfig(row.config);
		let eventCount = 0;
		let dayCounts: number[] = [];
		let topTypes: ReportsModulePreviewActivityDigest['topTypes'] = [];

		if (ctx) {
			const data = await queryActivityDigestReport(ctx.wrkspaceId, config);
			eventCount = data.eventCount;
			dayCounts = data.byDay.slice(-7).map((group) => group.events.length);
			topTypes = Object.entries(data.countsByType)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(([type, count]) => ({
					label: formatActivityTypeLabel(type),
					count
				}));
		}

		const preview: ReportsModulePreviewActivityDigest = {
			configured: true,
			reportType: 'activity_digest',
			metric: eventCount,
			headline: `${eventCount} event${eventCount === 1 ? '' : 's'}`,
			dayCounts,
			topTypes
		};
		return preview;
	}

	const config = parseSummaryConfig(row.config);
	const data = hasSources ? await querySummaryReportForInstance(row.id, config) : null;
	const completionPercent = data?.progress?.completionPercent ?? null;
	const preview: ReportsModulePreviewSummary = {
		configured: true,
		reportType: 'summary',
		metric: completionPercent,
		headline: !hasSources
			? 'Link modules'
			: completionPercent !== null
				? `${completionPercent}% complete`
				: 'Executive snapshot',
		hasSources,
		completionPercent,
		openTasks: data?.workload?.totals.open ?? null,
		overdueCount: data?.progress?.overdueCount ?? data?.workload?.totals.overdue ?? null,
		upcomingCount: (data?.upcoming?.tasks.length ?? 0) + (data?.upcoming?.events.length ?? 0)
	};
	return preview;
}

export type PersonalTaskRow = {
	id: string;
	title: string;
	moduleId: string;
	moduleTitle: string;
	href: string;
	completedAt: Date | null;
	dueAt: Date | null;
	status: string;
};

export type PersonalDayCount = {
	dayKey: string;
	dayLabel: string;
	count: number;
};

export type PersonalActivityDayCount = {
	dayKey: string;
	count: number;
};

export type PersonalReportData = {
	config: PersonalReportConfig;
	memberName: string;
	completedInRange: PersonalTaskRow[];
	openAssigned: PersonalTaskRow[];
	overdueAssigned: PersonalTaskRow[];
	completedByDay: PersonalDayCount[];
	activityByDay: PersonalActivityDayCount[];
	activity: Awaited<ReturnType<typeof listWrkspaceActivityInRange>>;
};

export type ActivityDigestReportData = {
	config: ActivityDigestReportConfig;
	eventCount: number;
	countsByType: Record<string, number>;
	byDay: ActivityDayGroup[];
};

export type SummaryUpcomingTask = {
	id: string;
	title: string;
	moduleId: string;
	moduleTitle: string;
	dueAt: Date;
	href: string;
};

export type SummaryUpcomingEvent = {
	id: string;
	title: string;
	moduleId: string;
	moduleTitle: string;
	startsAt: Date;
	href: string;
};

export type SummaryReportData = {
	config: SummaryReportConfig;
	progress: { completionPercent: number; overdueCount: number } | null;
	workload: { topAssignees: WorkloadAssigneeRow[]; totals: WorkloadReportData['totals'] } | null;
	upcoming: { tasks: SummaryUpcomingTask[]; events: SummaryUpcomingEvent[] } | null;
	activity: Awaited<ReturnType<typeof listWrkspaceActivityInRange>> | null;
};

async function loadPersonalMemberName(teamId: string, memberUserId: string): Promise<string> {
	const [row] = await db
		.select({ name: user.name })
		.from(teamMember)
		.innerJoin(user, eq(teamMember.userId, user.id))
		.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, memberUserId)))
		.limit(1);

	return row?.name ?? 'Unknown';
}

type PersonalTaskLoaded = {
	id: string;
	title: string;
	moduleId: string;
	moduleTitle: string;
	status: string;
	dueAt: Date | null;
	completedAt: Date | null;
	href: string;
};

async function loadPersonalTasksForUser(
	taskModuleIds: string[],
	memberUserId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<Map<string, PersonalTaskLoaded>> {
	if (taskModuleIds.length === 0) return new Map();

	const assigneeRows = await db
		.select({ taskId: taskAssignee.taskId })
		.from(taskAssignee)
		.where(eq(taskAssignee.userId, memberUserId));

	const assignedTaskIds = new Set(assigneeRows.map((r) => r.taskId));
	if (assignedTaskIds.size === 0) return new Map();

	const taskRows = await db
		.select({
			id: taskItem.id,
			title: taskItem.title,
			moduleId: taskItem.moduleId,
			status: taskItem.status,
			dueAt: taskItem.dueAt,
			completedAt: taskItem.completedAt
		})
		.from(taskItem)
		.where(inArray(taskItem.moduleId, taskModuleIds));

	const moduleTitles = await db
		.select({ id: wrkspaceModule.id, title: wrkspaceModule.title })
		.from(wrkspaceModule)
		.where(inArray(wrkspaceModule.id, taskModuleIds));

	const titleByModule = new Map(moduleTitles.map((m) => [m.id, m.title]));

	const result = new Map<string, PersonalTaskLoaded>();

	for (const task of taskRows) {
		if (!assignedTaskIds.has(task.id)) continue;
		const moduleTitle = titleByModule.get(task.moduleId) ?? 'Tasks';
		result.set(task.id, {
			...task,
			moduleTitle,
			href: buildTaskItemHref(teamSlug, wrkspaceSlug, task.moduleId, task.id)
		});
	}

	return result;
}

function toPersonalTaskRow(task: {
	id: string;
	title: string;
	moduleId: string;
	moduleTitle: string;
	status: string;
	dueAt: Date | null;
	completedAt: Date | null;
	href: string;
}): PersonalTaskRow {
	return {
		id: task.id,
		title: task.title,
		moduleId: task.moduleId,
		moduleTitle: task.moduleTitle,
		href: task.href,
		completedAt: task.completedAt,
		dueAt: task.dueAt,
		status: task.status
	};
}

function personalDayKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function personalDayLabel(date: Date): string {
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildPersonalDaySeries(
	from: Date,
	to: Date,
	counts: Map<string, number>,
	includeLabel: boolean
): PersonalDayCount[] | PersonalActivityDayCount[] {
	const result: PersonalDayCount[] = [];
	const cursor = new Date(from);
	cursor.setHours(0, 0, 0, 0);
	const end = new Date(to);
	end.setHours(0, 0, 0, 0);

	while (cursor <= end) {
		const dayKey = personalDayKey(cursor);
		const count = counts.get(dayKey) ?? 0;
		if (includeLabel) {
			result.push({ dayKey, dayLabel: personalDayLabel(cursor), count });
		} else {
			(result as PersonalActivityDayCount[]).push({ dayKey, count });
		}
		cursor.setDate(cursor.getDate() + 1);
	}

	return result;
}

function aggregatePersonalCompletedByDay(
	from: Date,
	to: Date,
	completed: PersonalTaskRow[]
): PersonalDayCount[] {
	const counts = new Map<string, number>();
	for (const task of completed) {
		if (!task.completedAt) continue;
		const key = personalDayKey(task.completedAt);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return buildPersonalDaySeries(from, to, counts, true) as PersonalDayCount[];
}

function aggregatePersonalActivityByDay(
	from: Date,
	to: Date,
	activity: Awaited<ReturnType<typeof listWrkspaceActivityInRange>>
): PersonalActivityDayCount[] {
	const counts = new Map<string, number>();
	for (const event of activity) {
		const key = personalDayKey(event.createdAt);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return buildPersonalDaySeries(from, to, counts, false) as PersonalActivityDayCount[];
}

export async function countPersonalCompletedInRange(
	wrkspaceId: string,
	config: PersonalReportConfig
): Promise<number> {
	const data = await queryPersonalReport(wrkspaceId, '', config);
	return data.completedInRange.length;
}

export async function queryPersonalReport(
	wrkspaceId: string,
	teamId: string,
	config: PersonalReportConfig,
	teamSlug?: string,
	wrkspaceSlug?: string
): Promise<PersonalReportData> {
	const { from, to } = resolveReportDateRange(config.dateRange);
	const taskModuleIds = await listTaskModuleIdsForWrkspace(wrkspaceId);
	const slugTeam = teamSlug ?? '';
	const slugWrk = wrkspaceSlug ?? '';

	const tasksById = await loadPersonalTasksForUser(taskModuleIds, config.userId, slugTeam, slugWrk);

	const now = new Date();
	const completedInRange: PersonalTaskRow[] = [];
	const openAssigned: PersonalTaskRow[] = [];
	const overdueAssigned: PersonalTaskRow[] = [];

	for (const task of tasksById.values()) {
		const row = toPersonalTaskRow(task);
		if (task.status === 'done') {
			if (task.completedAt && task.completedAt >= from && task.completedAt <= to) {
				completedInRange.push(row);
			}
		} else {
			openAssigned.push(row);
			if (task.dueAt && task.dueAt < now) {
				overdueAssigned.push(row);
			}
		}
	}

	completedInRange.sort(
		(a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)
	);
	openAssigned.sort((a, b) => a.title.localeCompare(b.title));
	overdueAssigned.sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));

	const activity = await listWrkspaceActivityInRange(wrkspaceId, {
		from,
		to,
		actorUserId: config.userId,
		limit: 50
	});

	const memberName = teamId ? await loadPersonalMemberName(teamId, config.userId) : 'Unknown';

	return {
		config,
		memberName,
		completedInRange,
		openAssigned,
		overdueAssigned,
		completedByDay: aggregatePersonalCompletedByDay(from, to, completedInRange),
		activityByDay: aggregatePersonalActivityByDay(from, to, activity),
		activity
	};
}

export async function getPersonalReportData(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string
): Promise<PersonalReportData | undefined> {
	const report = await getReport(userId, teamSlug, wrkspaceSlug, moduleId, reportId);
	if (!report || report.type !== 'personal') return undefined;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;

	const config = report.config as PersonalReportConfig;
	if (!(await isUserOnTeam(access.teamId, config.userId))) return undefined;

	return queryPersonalReport(access.wrkspaceId, access.teamId, config, teamSlug, wrkspaceSlug);
}

export async function countActivityDigestEvents(
	wrkspaceId: string,
	config: ActivityDigestReportConfig
): Promise<number> {
	const { from, to } = resolveReportDateRange(config.dateRange);
	const events = await listWrkspaceActivityInRange(wrkspaceId, {
		from,
		to,
		moduleType: config.moduleType,
		limit: 500
	});
	return events.length;
}

export async function queryActivityDigestReport(
	wrkspaceId: string,
	config: ActivityDigestReportConfig
): Promise<ActivityDigestReportData> {
	const { from, to } = resolveReportDateRange(config.dateRange);
	const events = await listWrkspaceActivityInRange(wrkspaceId, {
		from,
		to,
		moduleType: config.moduleType,
		limit: 500
	});

	return {
		config,
		eventCount: events.length,
		countsByType: countActivityByType(events),
		byDay: groupActivityByDay(events)
	};
}

export async function getActivityDigestReportData(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string
): Promise<ActivityDigestReportData | undefined> {
	const report = await getReport(userId, teamSlug, wrkspaceSlug, moduleId, reportId);
	if (!report || report.type !== 'activity_digest') return undefined;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;

	return queryActivityDigestReport(access.wrkspaceId, report.config as ActivityDigestReportConfig);
}

async function querySummaryReportForInstance(
	reportId: string,
	config: SummaryReportConfig,
	teamSlug?: string,
	wrkspaceSlug?: string
): Promise<SummaryReportData | null> {
	const links = await loadSourceLinks(reportId);
	const [modRow] = await db
		.select({ wrkspaceId: wrkspaceModule.wrkspaceId })
		.from(reportInstance)
		.innerJoin(wrkspaceModule, eq(reportInstance.moduleId, wrkspaceModule.id))
		.where(eq(reportInstance.id, reportId))
		.limit(1);

	const wrkspaceId = modRow?.wrkspaceId;
	if (!wrkspaceId) return null;

	return querySummaryReport(links, wrkspaceId, config, teamSlug, wrkspaceSlug);
}

export async function querySummaryReport(
	sourceLinks: ReportSourceLinkRow[],
	wrkspaceId: string,
	config: SummaryReportConfig,
	teamSlug?: string,
	wrkspaceSlug?: string
): Promise<SummaryReportData> {
	const taskModuleIds = sourceLinks
		.filter((l) => l.moduleType === 'tasks')
		.map((l) => l.sourceModuleId);
	const calendarModuleIds = sourceLinks
		.filter((l) => l.moduleType === 'calendar')
		.map((l) => l.sourceModuleId);

	const sections = new Set(config.sections);
	const { from, to } = resolveReportDateRange(config.dateRange);
	const now = new Date();
	const weekEnd = dueWithinSevenDaysFrom(now);

	let progress: SummaryReportData['progress'] = null;
	if (sections.has('progress') && taskModuleIds.length > 0) {
		const data = await queryProgressReport(taskModuleIds, {}, sourceLinks);
		progress = {
			completionPercent: data.completionPercent,
			overdueCount: data.overdueCount
		};
	}

	let workload: SummaryReportData['workload'] = null;
	if (sections.has('workload') && taskModuleIds.length > 0) {
		const data = await queryWorkloadReport(taskModuleIds, { includeUnassigned: true });
		workload = {
			topAssignees: data.byAssignee.slice(0, 3),
			totals: data.totals
		};
	}

	let upcoming: SummaryReportData['upcoming'] = null;
	if (sections.has('upcoming')) {
		const tasks: SummaryUpcomingTask[] = [];
		const events: SummaryUpcomingEvent[] = [];

		if (taskModuleIds.length > 0) {
			const taskRows = await db
				.select({
					id: taskItem.id,
					title: taskItem.title,
					moduleId: taskItem.moduleId,
					dueAt: taskItem.dueAt,
					status: taskItem.status
				})
				.from(taskItem)
				.where(
					and(
						inArray(taskItem.moduleId, taskModuleIds),
						ne(taskItem.status, 'done'),
						gte(taskItem.dueAt, now),
						lte(taskItem.dueAt, weekEnd)
					)
				)
				.orderBy(asc(taskItem.dueAt))
				.limit(10);

			const titleByModule = new Map(sourceLinks.map((l) => [l.sourceModuleId, l.moduleTitle]));

			for (const row of taskRows) {
				if (!row.dueAt) continue;
				tasks.push({
					id: row.id,
					title: row.title,
					moduleId: row.moduleId,
					moduleTitle: titleByModule.get(row.moduleId) ?? 'Tasks',
					dueAt: row.dueAt,
					href:
						teamSlug && wrkspaceSlug
							? buildTaskItemHref(teamSlug, wrkspaceSlug, row.moduleId, row.id)
							: '#'
				});
			}
		}

		if (calendarModuleIds.length > 0) {
			const eventRows = await db
				.select({
					id: calendarEvent.id,
					title: calendarEvent.title,
					moduleId: calendarEvent.moduleId,
					startsAt: calendarEvent.startsAt
				})
				.from(calendarEvent)
				.where(
					and(
						inArray(calendarEvent.moduleId, calendarModuleIds),
						gte(calendarEvent.startsAt, now),
						lte(calendarEvent.startsAt, weekEnd)
					)
				)
				.orderBy(asc(calendarEvent.startsAt))
				.limit(10);

			const titleByModule = new Map(sourceLinks.map((l) => [l.sourceModuleId, l.moduleTitle]));

			for (const row of eventRows) {
				events.push({
					id: row.id,
					title: row.title,
					moduleId: row.moduleId,
					moduleTitle: titleByModule.get(row.moduleId) ?? 'Calendar',
					startsAt: row.startsAt,
					href:
						teamSlug && wrkspaceSlug
							? buildCalendarModuleHref(teamSlug, wrkspaceSlug, row.moduleId)
							: '#'
				});
			}
		}

		upcoming = { tasks, events };
	}

	let activity: SummaryReportData['activity'] = null;
	if (sections.has('activity')) {
		activity = await listWrkspaceActivityInRange(wrkspaceId, {
			from,
			to,
			limit: 10
		});
	}

	return {
		config,
		progress,
		workload,
		upcoming,
		activity
	};
}

export async function getSummaryReportData(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	reportId: string
): Promise<SummaryReportData | undefined> {
	const report = await getReport(userId, teamSlug, wrkspaceSlug, moduleId, reportId);
	if (!report || report.type !== 'summary') return undefined;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;

	return querySummaryReport(
		report.sourceLinks,
		access.wrkspaceId,
		report.config as SummaryReportConfig,
		teamSlug,
		wrkspaceSlug
	);
}
