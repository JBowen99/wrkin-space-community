<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ReportSourceOptions } from '$lib/server/reports';
	import { MODULE_CATALOG } from '$lib/shared/modules';
	import {
		REPORT_TYPE_HEADLINES,
		SUMMARY_SECTIONS,
		TIMELINE_GROUP_BY_OPTIONS,
		allowsCalendarLinks,
		isReportType,
		isTasksOnlyReportType,
		requiresReportSourceLinks,
		type ReportDatePreset,
		type ReportType
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

	export type ReportTypeOption = {
		id: string;
		reportType: ReportType;
		name: string;
		description: string;
	};

	type Props = {
		moduleTitle: string;
		sourceOptions: ReportSourceOptions;
		teamMembers: TeamMemberOption[];
		reportTypeOptions: ReportTypeOption[];
	};

	let { moduleTitle, sourceOptions, teamMembers, reportTypeOptions }: Props = $props();

	type WizardStep = 'type' | 'configure';
	let step = $state<WizardStep>('type');
	let selectedType = $state<ReportType | ''>('');
	let selectedIds = $state<string[]>([]);
	let includeUnassigned = $state(true);
	let datePreset = $state<ReportDatePreset>('last_30_days');
	let memberId = $state('');
	let moduleTypeFilter = $state('');
	let timeScale = $state<'week' | 'day'>('week');
	let groupBy = $state<'flat' | 'module'>('flat');
	let showTasks = $state(true);
	let showEvents = $state(true);
	let showDependencies = $state(true);
	let showCompleted = $state(true);
	const filterStatus: Record<string, boolean> = $state({});
	const filterPriority: Record<string, boolean> = $state({});
	const sectionEnabled: Record<string, boolean> = $state(
		Object.fromEntries(SUMMARY_SECTIONS.map((section) => [section, true]))
	);

	const selectedOption = $derived(
		reportTypeOptions.find((option) => option.reportType === selectedType)
	);
	const reportTypeSelectOptions = $derived(
		reportTypeOptions.map((option) => ({ value: option.reportType, label: option.name }))
	);
	const needsSources = $derived(selectedType !== '' && requiresReportSourceLinks(selectedType));
	const isTimeline = $derived(selectedType === 'timeline');
	const isProgress = $derived(selectedType === 'progress');
	const isSummary = $derived(selectedType === 'summary');
	const isTasksOnly = $derived(selectedType !== '' && isTasksOnlyReportType(selectedType));
	const showCalendar = $derived(selectedType !== '' && allowsCalendarLinks(selectedType));
	const isWorkload = $derived(selectedType === 'workload');
	const isPersonal = $derived(selectedType === 'personal');
	const isDigest = $derived(selectedType === 'activity_digest');

	const moduleTypeOptions = $derived([
		{ value: '', label: 'All modules' },
		...MODULE_CATALOG.filter((entry) => entry.enabled).map((entry) => ({
			value: entry.type,
			label: entry.label
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

	const sourceModuleIdsJson = $derived(JSON.stringify(selectedIds));
	const canSubmit = $derived(
		selectedType !== '' &&
			(!needsSources || selectedIds.length > 0) &&
			(!isPersonal || memberId !== '' || teamMembers.length === 0)
	);

	$effect(() => {
		if (reportTypeOptions.length > 0 && !selectedType) {
			selectType(reportTypeOptions[0].reportType);
		}
	});

	function defaultSourceIdsForType(type: ReportType): string[] {
		const taskIds = sourceOptions.taskModules.map((module) => module.id);
		if (!requiresReportSourceLinks(type)) return [];
		if (type === 'progress' || type === 'workload') return taskIds;
		const calendarIds = sourceOptions.calendarModules.map((module) => module.id);
		return [...taskIds, ...calendarIds];
	}

	function selectType(type: ReportType) {
		selectedType = type;
		selectedIds = defaultSourceIdsForType(type);
		if (type === 'personal' && !memberId && teamMembers.length > 0) {
			memberId = teamMembers[0]?.id ?? '';
		}
	}

	function selectTypeFromValue(value: string) {
		if (isReportType(value)) {
			selectType(value);
		}
	}

	function goToConfigure() {
		if (!selectedType) return;
		step = 'configure';
	}

	function goBackToType() {
		step = 'type';
	}
</script>

<div class="mt-6">
	{#if step === 'type'}
		<div class="mx-auto flex w-full max-w-lg flex-col items-center px-4">
			<div class="w-full text-center">
				<h2 class="text-ink text-lg font-semibold">Choose a report type</h2>
				<p class="text-ink-muted mx-auto mt-2 max-w-md text-sm">
					Pick the question you want {moduleTitle} to answer. You can connect data sources after
					choosing the view.
				</p>
			</div>

			<div class="mt-8 w-full space-y-4 text-left">
				<div>
					<Label for="reports-type-select">Report type</Label>
					<Select
						id="reports-type-select"
						value={selectedType}
						options={reportTypeSelectOptions}
						placeholder="Select a report type…"
						onValueChange={selectTypeFromValue}
					/>
				</div>

				{#if selectedOption}
					<div class="border-border bg-surface-raised rounded-xl border p-4">
						<p class="text-ink font-medium">{selectedOption.name}</p>
						<p class="text-ink-muted mt-1 text-sm">
							{REPORT_TYPE_HEADLINES[selectedOption.reportType]}
						</p>
						<p class="text-ink-muted mt-3 text-sm">{selectedOption.description}</p>
					</div>
				{/if}

				<div class="flex justify-center pt-2">
					<ButtonUi type="button" class="min-w-36" disabled={!selectedType} onclick={goToConfigure}>
						Continue
					</ButtonUi>
				</div>
			</div>
		</div>
	{:else if selectedType && isReportType(selectedType)}
		<div class="max-w-3xl">
			<button
				type="button"
				class="text-ink-muted hover:text-ink text-sm transition"
				onclick={goBackToType}
			>
				← Change report type
			</button>

			<h2 class="text-ink mt-3 text-lg font-semibold">Set up {selectedOption?.name ?? 'report'}</h2>
			<p class="text-ink-muted mt-1 text-sm">
				{REPORT_TYPE_HEADLINES[selectedType]}
			</p>

			<form
				method="POST"
				action="?/setupReport"
				use:enhance
				class="border-border bg-surface-raised mt-6 flex flex-col gap-4 rounded-xl border p-4"
			>
				<input type="hidden" name="reportType" value={selectedType} />
				<input type="hidden" name="title" value={moduleTitle} />
				<input type="hidden" name="sourceModuleIds" value={sourceModuleIdsJson} />
				{#if isPersonal}
					<input type="hidden" name="userId" value={memberId} />
				{/if}
				{#if isDigest && moduleTypeFilter}
					<input type="hidden" name="moduleType" value={moduleTypeFilter} />
				{/if}

				{#if isPersonal && teamMembers.length > 0}
					<ReportMemberPicker
						members={teamMembers}
						bind:value={memberId}
						id="setup-report-member"
					/>
					<ReportDateRangeFields id="setup-report-date" bind:value={datePreset} />
				{:else if isDigest}
					<ReportDateRangeFields id="setup-report-date" bind:value={datePreset} />
					<div>
						<Label for="setup-report-module-type">Module type</Label>
						<Select
							id="setup-report-module-type"
							options={moduleTypeOptions}
							value={moduleTypeFilter}
							onValueChange={(value) => {
								moduleTypeFilter = value;
							}}
							class="mt-1"
						/>
					</div>
				{:else if isSummary}
					<ReportDateRangeFields id="setup-report-date" bind:value={datePreset} />
					<div>
						<p class="text-ink text-sm font-medium">Sections</p>
						<div class="mt-2 flex flex-col gap-2">
							{#each SUMMARY_SECTIONS as section (section)}
								<div class="flex items-center gap-2">
									<Checkbox
										id="setup-section-{section}"
										name="section_{section}"
										checked={sectionEnabled[section]}
										onCheckedChange={(value) => {
											sectionEnabled[section] = value === true;
										}}
									/>
									<Label
										for="setup-section-{section}"
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
						<p class="text-ink-muted mt-1 text-sm">
							Choose which modules this report pulls data from.
						</p>
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
							<Label for="setup-timeline-time-scale">Time scale</Label>
							<Select
								id="setup-timeline-time-scale"
								name="timeScale"
								options={timeScaleOptions}
								value={timeScale}
								onValueChange={(value) => {
									if (value === 'week' || value === 'day') timeScale = value;
								}}
								class="mt-1"
							/>
						</div>
						<div>
							<Label for="setup-timeline-group-by">Group by</Label>
							<Select
								id="setup-timeline-group-by"
								name="groupBy"
								options={groupByOptions}
								value={groupBy}
								onValueChange={(value) => {
									if (value === 'flat' || value === 'module') groupBy = value;
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
									id="setup-show-tasks"
									name="show_tasks"
									checked={showTasks}
									onCheckedChange={(value) => {
										showTasks = value === true;
									}}
								/>
								<Label for="setup-show-tasks" class="text-ink cursor-pointer text-sm font-normal">
									Tasks
								</Label>
							</div>
							<div class="flex items-center gap-2">
								<Checkbox
									id="setup-show-events"
									name="show_events"
									checked={showEvents}
									onCheckedChange={(value) => {
										showEvents = value === true;
									}}
								/>
								<Label for="setup-show-events" class="text-ink cursor-pointer text-sm font-normal">
									Calendar events
								</Label>
							</div>
							<div class="flex items-center gap-2">
								<Checkbox
									id="setup-show-deps"
									name="show_dependencies"
									checked={showDependencies}
									onCheckedChange={(value) => {
										showDependencies = value === true;
									}}
								/>
								<Label for="setup-show-deps" class="text-ink cursor-pointer text-sm font-normal">
									Dependencies
								</Label>
							</div>
							<div class="flex items-center gap-2">
								<Checkbox
									id="setup-show-completed"
									name="show_completed"
									checked={showCompleted}
									onCheckedChange={(value) => {
										showCompleted = value === true;
									}}
								/>
								<Label
									for="setup-show-completed"
									class="text-ink cursor-pointer text-sm font-normal"
								>
									Completed tasks
								</Label>
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
										id="setup-filter-status-{status}"
										name="filter_status"
										value={status}
										checked={filterStatus[status]}
										onCheckedChange={(value) => {
											filterStatus[status] = value === true;
										}}
									/>
									<Label
										for="setup-filter-status-{status}"
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
										id="setup-filter-priority-{priority}"
										name="filter_priority"
										value={priority}
										checked={filterPriority[priority]}
										onCheckedChange={(value) => {
											filterPriority[priority] = value === true;
										}}
									/>
									<Label
										for="setup-filter-priority-{priority}"
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
							id="setup-include-unassigned"
							name="includeUnassigned"
							checked={includeUnassigned}
							onCheckedChange={(value) => {
								includeUnassigned = value === true;
							}}
						/>
						<Label
							for="setup-include-unassigned"
							class="text-ink cursor-pointer text-sm font-normal"
						>
							Include unassigned tasks
						</Label>
					</div>
				{/if}

				<div class="flex justify-end gap-2">
					<ButtonUi type="button" variant="secondary" class="h-9" onclick={goBackToType}>
						Back
					</ButtonUi>
					<ButtonUi type="submit" class="h-9" disabled={!canSubmit}>Create report</ButtonUi>
				</div>
			</form>
		</div>
	{/if}
</div>
