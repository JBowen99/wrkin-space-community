<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ReportSourceOptions } from '$lib/server/reports';
	import { MODULE_CATALOG } from '$lib/shared/modules';
	import {
		SUMMARY_SECTIONS,
		TIMELINE_GROUP_BY_OPTIONS,
		allowsCalendarLinks,
		isTasksOnlyReportType,
		requiresReportSourceLinks,
		type ActivityDigestReportConfig,
		type PersonalReportConfig,
		type ProgressReportConfig,
		type ReportDatePreset,
		type ReportType,
		type SummaryReportConfig,
		type TimelineReportConfig,
		type WorkloadReportConfig
	} from '$lib/shared/reports';
	import {
		TASK_PRIORITIES,
		TASK_PRIORITY_LABELS,
		TASK_STATUSES,
		TASK_STATUS_LABELS
	} from '$lib/shared/tasks';
	import ButtonUi from '../../ui/button.svelte';
	import Checkbox from '../../ui/checkbox.svelte';
	import Label from '../../ui/label.svelte';
	import Select from '../../ui/select.svelte';
	import ReportDateRangeFields from './report-date-range-fields.svelte';
	import ReportMemberPicker, { type TeamMemberOption } from './report-member-picker.svelte';
	import ReportSourcePicker from './report-source-picker.svelte';

	type Props = {
		reportId: string;
		reportType: ReportType;
		title: string;
		sourceOptions: ReportSourceOptions;
		initialSourceIds: string[];
		workloadConfig?: WorkloadReportConfig;
		personalConfig?: PersonalReportConfig;
		digestConfig?: ActivityDigestReportConfig;
		summaryConfig?: SummaryReportConfig;
		timelineConfig?: TimelineReportConfig;
		progressConfig?: ProgressReportConfig;
		teamMembers?: TeamMemberOption[];
		canEdit: boolean;
	};

	let {
		reportId,
		reportType,
		title,
		sourceOptions,
		initialSourceIds,
		workloadConfig,
		personalConfig,
		digestConfig,
		summaryConfig,
		timelineConfig,
		progressConfig,
		teamMembers = [],
		canEdit
	}: Props = $props();

	let selectedIds = $state([...initialSourceIds]);
	let editing = $state(false);
	let includeUnassigned = $state(workloadConfig?.includeUnassigned ?? true);
	let datePreset = $state<ReportDatePreset>(
		personalConfig?.dateRange.preset ??
			digestConfig?.dateRange.preset ??
			summaryConfig?.dateRange.preset ??
			'last_30_days'
	);
	let memberId = $state(personalConfig?.userId ?? '');
	let moduleTypeFilter = $state(digestConfig?.moduleType ?? '');
	let timeScale = $state<'week' | 'day'>(timelineConfig?.timeScale ?? 'week');
	let groupBy = $state(timelineConfig?.groupBy ?? 'flat');
	let showTasks = $state(timelineConfig?.show.tasks ?? true);
	let showEvents = $state(timelineConfig?.show.events ?? true);
	let showDependencies = $state(timelineConfig?.show.dependencies ?? true);
	let showCompleted = $state(timelineConfig?.show.completed ?? true);
	const filterStatus: Record<string, boolean> = $state({});
	const filterPriority: Record<string, boolean> = $state({});
	const sectionEnabled: Record<string, boolean> = $state(
		Object.fromEntries(
			SUMMARY_SECTIONS.map((s) => [s, summaryConfig?.sections.includes(s) ?? true])
		)
	);

	const needsSources = $derived(requiresReportSourceLinks(reportType));
	const isTimeline = $derived(reportType === 'timeline');
	const isProgress = $derived(reportType === 'progress');
	const isSummary = $derived(reportType === 'summary');
	const isTasksOnly = $derived(isTasksOnlyReportType(reportType));
	const showCalendar = $derived(allowsCalendarLinks(reportType));
	const isWorkload = $derived(reportType === 'workload');
	const isPersonal = $derived(reportType === 'personal');
	const isDigest = $derived(reportType === 'activity_digest');

	const moduleTypeOptions = $derived([
		{ value: '', label: 'All modules' },
		...MODULE_CATALOG.filter((m) => m.enabled).map((m) => ({
			value: m.type,
			label: m.label
		}))
	]);

	const groupByOptions = $derived(
		TIMELINE_GROUP_BY_OPTIONS.map((value) => ({
			value,
			label: value === 'module' ? 'By module' : 'Flat list'
		}))
	);

	const timeScaleOptions = [
		{ value: 'week', label: 'Week' },
		{ value: 'day', label: 'Day' }
	];

	function syncFilterMaps(config?: ProgressReportConfig) {
		for (const status of TASK_STATUSES) {
			filterStatus[status] = config?.filters?.status?.includes(status) ?? false;
		}
		for (const priority of TASK_PRIORITIES) {
			filterPriority[priority] = config?.filters?.priority?.includes(priority) ?? false;
		}
	}

	$effect(() => {
		selectedIds = [...initialSourceIds];
		includeUnassigned = workloadConfig?.includeUnassigned ?? true;
		datePreset =
			personalConfig?.dateRange.preset ??
			digestConfig?.dateRange.preset ??
			summaryConfig?.dateRange.preset ??
			'last_30_days';
		memberId = personalConfig?.userId ?? '';
		moduleTypeFilter = digestConfig?.moduleType ?? '';
		timeScale = timelineConfig?.timeScale ?? 'week';
		groupBy = timelineConfig?.groupBy ?? 'flat';
		showTasks = timelineConfig?.show.tasks ?? true;
		showEvents = timelineConfig?.show.events ?? true;
		showDependencies = timelineConfig?.show.dependencies ?? true;
		showCompleted = timelineConfig?.show.completed ?? true;
		syncFilterMaps(progressConfig);
		for (const section of SUMMARY_SECTIONS) {
			sectionEnabled[section] = summaryConfig?.sections.includes(section) ?? true;
		}
	});

	const sourceModuleIdsJson = $derived(JSON.stringify(selectedIds));
	const canSubmit = $derived(!needsSources || selectedIds.length > 0);
</script>

{#if canEdit}
	{#if !editing}
		<ButtonUi type="button" variant="secondary" class="mt-8 h-9" onclick={() => (editing = true)}>
			Report settings
		</ButtonUi>
	{:else}
		<form
			method="POST"
			action="?/updateReport"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
					editing = false;
				};
			}}
			class="border-border bg-surface-raised mt-6 flex flex-col gap-4 rounded-xl border p-4"
		>
			<input type="hidden" name="reportId" value={reportId} />
			<input type="hidden" name="title" value={title} />
			<input type="hidden" name="sourceModuleIds" value={sourceModuleIdsJson} />
			{#if isPersonal}
				<input type="hidden" name="userId" value={memberId} />
			{/if}
			{#if isDigest && moduleTypeFilter}
				<input type="hidden" name="moduleType" value={moduleTypeFilter} />
			{/if}

			{#if isPersonal && teamMembers.length > 0}
				<ReportMemberPicker members={teamMembers} bind:value={memberId} id="edit-report-member" />
				<ReportDateRangeFields id="edit-report-date" bind:value={datePreset} />
			{:else if isDigest}
				<ReportDateRangeFields id="edit-report-date" bind:value={datePreset} />
				<div>
					<Label for="edit-report-module-type">Module type</Label>
					<Select
						id="edit-report-module-type"
						options={moduleTypeOptions}
						value={moduleTypeFilter}
						onValueChange={(v) => {
							moduleTypeFilter = v;
						}}
						class="mt-1"
					/>
				</div>
			{:else if isSummary}
				<ReportDateRangeFields id="edit-report-date" bind:value={datePreset} />
				<div>
					<p class="text-ink text-sm font-medium">Sections</p>
					<div class="mt-2 flex flex-col gap-2">
						{#each SUMMARY_SECTIONS as section (section)}
							<div class="flex items-center gap-2">
								<Checkbox
									id="edit-section-{section}"
									name="section_{section}"
									checked={sectionEnabled[section]}
									onCheckedChange={(v) => {
										sectionEnabled[section] = v === true;
									}}
								/>
								<Label
									for="edit-section-{section}"
									class="text-ink cursor-pointer text-sm font-normal capitalize"
								>
									{section}
								</Label>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if needsSources}
				<div>
					<p class="text-ink text-sm font-medium">Linked modules</p>
					<div class="mt-2 space-y-4">
						{#if isTasksOnly}
							<ReportSourcePicker
								taskModules={sourceOptions.taskModules}
								bind:selectedIds
								showTasks={true}
								showCalendar={false}
							/>
						{:else}
							<div>
								<p class="text-ink-muted text-xs font-medium">Task modules</p>
								<div class="mt-1">
									<ReportSourcePicker
										taskModules={sourceOptions.taskModules}
										bind:selectedIds
										showTasks={true}
										showCalendar={false}
									/>
								</div>
							</div>
							{#if showCalendar}
								<div>
									<p class="text-ink-muted text-xs font-medium">Calendar modules</p>
									<div class="mt-1">
										<ReportSourcePicker
											calendarModules={sourceOptions.calendarModules}
											bind:selectedIds
											showTasks={false}
											showCalendar={true}
										/>
									</div>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{/if}

			{#if isTimeline}
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<Label for="timeline-time-scale">Time scale</Label>
						<Select
							id="timeline-time-scale"
							name="timeScale"
							options={timeScaleOptions}
							value={timeScale}
							onValueChange={(v) => {
								if (v === 'week' || v === 'day') timeScale = v;
							}}
							class="mt-1"
						/>
					</div>
					<div>
						<Label for="timeline-group-by">Group by</Label>
						<Select
							id="timeline-group-by"
							name="groupBy"
							options={groupByOptions}
							value={groupBy}
							onValueChange={(v) => {
								if (v === 'flat' || v === 'module') groupBy = v;
							}}
							class="mt-1"
						/>
					</div>
				</div>
				<div>
					<p class="text-ink text-sm font-medium">Show</p>
					<div class="mt-2 flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<Checkbox
								id="show-tasks"
								name="show_tasks"
								checked={showTasks}
								onCheckedChange={(v) => {
									showTasks = v === true;
								}}
							/>
							<Label for="show-tasks" class="text-ink cursor-pointer text-sm font-normal"
								>Tasks</Label
							>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="show-events"
								name="show_events"
								checked={showEvents}
								onCheckedChange={(v) => {
									showEvents = v === true;
								}}
							/>
							<Label for="show-events" class="text-ink cursor-pointer text-sm font-normal"
								>Calendar events</Label
							>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="show-deps"
								name="show_dependencies"
								checked={showDependencies}
								onCheckedChange={(v) => {
									showDependencies = v === true;
								}}
							/>
							<Label for="show-deps" class="text-ink cursor-pointer text-sm font-normal"
								>Dependencies</Label
							>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="show-completed"
								name="show_completed"
								checked={showCompleted}
								onCheckedChange={(v) => {
									showCompleted = v === true;
								}}
							/>
							<Label for="show-completed" class="text-ink cursor-pointer text-sm font-normal"
								>Completed tasks</Label
							>
						</div>
					</div>
				</div>
			{/if}

			{#if isProgress}
				<div>
					<p class="text-ink text-sm font-medium">Filter by status</p>
					<div class="mt-2 flex flex-wrap gap-3">
						{#each TASK_STATUSES as status (status)}
							<div class="flex items-center gap-2">
								<Checkbox
									id="filter-status-{status}"
									name="filter_status"
									value={status}
									checked={filterStatus[status]}
									onCheckedChange={(v) => {
										filterStatus[status] = v === true;
									}}
								/>
								<Label
									for="filter-status-{status}"
									class="text-ink cursor-pointer text-sm font-normal"
								>
									{TASK_STATUS_LABELS[status]}
								</Label>
							</div>
						{/each}
					</div>
				</div>
				<div>
					<p class="text-ink text-sm font-medium">Filter by priority</p>
					<div class="mt-2 flex flex-wrap gap-3">
						{#each TASK_PRIORITIES as priority (priority)}
							<div class="flex items-center gap-2">
								<Checkbox
									id="filter-priority-{priority}"
									name="filter_priority"
									value={priority}
									checked={filterPriority[priority]}
									onCheckedChange={(v) => {
										filterPriority[priority] = v === true;
									}}
								/>
								<Label
									for="filter-priority-{priority}"
									class="text-ink cursor-pointer text-sm font-normal"
								>
									{TASK_PRIORITY_LABELS[priority]}
								</Label>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if isWorkload}
				<div class="flex items-center gap-2">
					<Checkbox
						id="include-unassigned"
						name="includeUnassigned"
						checked={includeUnassigned}
						onCheckedChange={(v) => {
							includeUnassigned = v === true;
						}}
					/>
					<Label for="include-unassigned" class="text-ink cursor-pointer text-sm font-normal">
						Include unassigned tasks
					</Label>
				</div>
			{/if}

			<div class="flex justify-end gap-2">
				<ButtonUi type="button" variant="secondary" class="h-9" onclick={() => (editing = false)}>
					Cancel
				</ButtonUi>
				<ButtonUi type="submit" class="h-9" disabled={!canSubmit}>Save</ButtonUi>
			</div>
		</form>
	{/if}
{/if}
