<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import type {
		TaskAttachmentRow,
		TaskDependencyRow,
		TaskModuleSettings,
		TaskRow,
		TeamMemberOption
	} from '$lib/server/tasks';
	import type { TaskGroupBy, TaskPriority, TaskStatus } from '$lib/shared/tasks';
	import { DEFAULT_TASK_PRIORITY, DEFAULT_TASK_STATUS } from '$lib/shared/tasks';
	import TasksListView from './tasks-list-view.svelte';
	import TasksKanbanView from './tasks-kanban-view.svelte';
	import TasksGanttView from './tasks-gantt-view.svelte';
	import TasksTaskPanel from './tasks-task-panel.svelte';
	import TasksSettingsDialog from './tasks-settings-dialog.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import Select from '../../ui/select.svelte';
	import { Tabs } from 'bits-ui';
	import type { GanttTimeScale } from '$lib/shared/tasks-gantt';

	type Props = {
		tasks: TaskRow[];
		teamMembers: TeamMemberOption[];
		taskModuleSettings: TaskModuleSettings;
		taskDependencies: TaskDependencyRow[];
		settingsOpen?: boolean;
	};

	let {
		tasks: tasksFromServer,
		teamMembers,
		taskModuleSettings,
		taskDependencies,
		settingsOpen = $bindable(false)
	}: Props = $props();

	let tasks = $state<TaskRow[]>([]);

	$effect(() => {
		tasks = tasksFromServer;
	});

	type ViewMode = 'list' | 'kanban' | 'gantt';

	let viewMode = $state<ViewMode>('list');
	let kanbanGroupBy = $state<TaskGroupBy>('status');
	let ganttTimeScale = $state<GanttTimeScale>('week');
	let panelOpen = $state(false);
	let panelMode = $state<'create' | 'edit'>('create');
	let editingTask = $state<TaskRow | null>(null);
	let createDefaults = $state<{ status?: TaskStatus; priority?: TaskPriority }>({});

	let linkMode = $state(false);
	let linkSourceId = $state<string | null>(null);
	let linkError = $state<string | null>(null);
	let linkSaving = $state(false);

	function openCreate(defaults?: { status?: TaskStatus; priority?: TaskPriority }) {
		panelMode = 'create';
		editingTask = null;
		createDefaults = defaults ?? {};
		panelOpen = true;
	}

	function openEdit(task: TaskRow) {
		panelMode = 'edit';
		editingTask = task;
		createDefaults = {};
		panelOpen = true;
	}

	function closePanel() {
		panelOpen = false;
		editingTask = null;
		createDefaults = {};
	}

	function syncEditingTaskSchedule(taskId: string, startsAt: Date, dueAt: Date) {
		if (panelMode !== 'edit' || editingTask?.id !== taskId) return;
		editingTask = { ...editingTask, startsAt, dueAt };
	}

	function syncTaskAttachments(taskId: string, attachments: TaskAttachmentRow[]) {
		tasks = tasks.map((t) => (t.id === taskId ? { ...t, attachments } : t));
		if (panelMode === 'edit' && editingTask?.id === taskId) {
			editingTask = { ...editingTask, attachments };
		}
	}

	function cancelLinkMode() {
		linkMode = false;
		linkSourceId = null;
		linkError = null;
	}

	function toggleLinkMode() {
		if (linkMode) {
			cancelLinkMode();
		} else {
			linkMode = true;
			linkSourceId = null;
			linkError = null;
		}
	}

	async function handleLinkSelect(taskId: string) {
		linkError = null;

		if (!linkSourceId) {
			linkSourceId = taskId;
			return;
		}

		if (linkSourceId === taskId) {
			linkError = 'Select a different task as the successor.';
			return;
		}

		linkSaving = true;
		const formData = new FormData();
		formData.set('fromTaskId', linkSourceId);
		formData.set('toTaskId', taskId);

		try {
			const response = await fetch('?/addTaskDependency', { method: 'POST', body: formData });
			const text = await response.text();
			const result = deserialize(text);
			if (result.type === 'failure') {
				const message =
					typeof result.data === 'object' &&
					result.data !== null &&
					'message' in result.data &&
					typeof result.data.message === 'string'
						? result.data.message
						: 'Could not add dependency';
				linkError = message;
				return;
			}
			await invalidateAll();
			cancelLinkMode();
		} finally {
			linkSaving = false;
		}
	}

	$effect(() => {
		if (!linkMode || viewMode !== 'gantt') return;

		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') cancelLinkMode();
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	$effect(() => {
		if (viewMode !== 'gantt') cancelLinkMode();
	});

	const createTaskStub = $derived.by((): TaskRow | null => {
		if (panelMode !== 'create') return null;
		return {
			id: '',
			moduleId: '',
			title: '',
			description: '',
			notes: '',
			status: createDefaults.status ?? DEFAULT_TASK_STATUS,
			priority: createDefaults.priority ?? DEFAULT_TASK_PRIORITY,
			startsAt: null,
			dueAt: null,
			completedAt: null,
			position: 0,
			percentDone: 0,
			customColor: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			assignees: [],
			blockedByIds: [],
			attachments: []
		};
	});

	const viewTabs = [
		{ id: 'list' as const, label: 'List' },
		{ id: 'kanban' as const, label: 'Kanban' },
		{ id: 'gantt' as const, label: 'Gantt' }
	];

	const controlSizeClass = 'h-11';

	const tabListClass = `inline-flex ${controlSizeClass} items-center rounded-lg border border-border bg-surface p-0.5`;

	const tabTriggerClass =
		'flex h-full items-center rounded-md px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 data-[state=active]:bg-accent data-[state=active]:text-white data-[state=inactive]:text-ink-muted data-[state=inactive]:hover:text-ink';

	const toolbarLabelClass = 'shrink-0 font-normal text-ink-muted';

	const panelTask = $derived.by(() => {
		if (panelMode === 'create') return createTaskStub;
		const id = editingTask?.id;
		if (!id) return null;
		const fromList = tasks.find((t) => t.id === id);
		if (!fromList) return editingTask;
		if (!editingTask) return fromList;
		return {
			...fromList,
			startsAt: editingTask.startsAt,
			dueAt: editingTask.dueAt,
			attachments: editingTask.attachments
		};
	});
</script>

<div class="mt-6 flex h-[calc(100vh-14rem)] min-h-0 flex-col gap-4">
	<div class="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
		<div class="flex flex-wrap items-center gap-3">
			<Tabs.Root
				value={viewMode}
				onValueChange={(v) => {
					if (v === 'list' || v === 'kanban' || v === 'gantt') {
						viewMode = v;
					}
				}}
			>
				<Tabs.List class={tabListClass} aria-label="Task views">
					{#each viewTabs as tab (tab.id)}
						<Tabs.Trigger value={tab.id} class={tabTriggerClass}>
							{tab.label}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</Tabs.Root>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			{#if viewMode === 'list'}
				<p class="text-sm text-ink-muted">
					{tasks.length} task{tasks.length === 1 ? '' : 's'}
				</p>
				<ButtonUi type="button" class="{controlSizeClass} px-4" onclick={() => openCreate()}>
					Add task
				</ButtonUi>
			{:else if viewMode === 'kanban'}
				<div class="flex items-center gap-2">
					<Label for="kanban-group-by" class={toolbarLabelClass}>Group by</Label>
					<Select
						id="kanban-group-by"
						bind:value={kanbanGroupBy}
						class="mt-0 {controlSizeClass} min-h-11 w-auto min-w-[7.5rem] px-3"
						placeholder="Group by"
						options={[
							{ value: 'status', label: 'Status' },
							{ value: 'priority', label: 'Priority' }
						]}
					/>
				</div>
			{:else if viewMode === 'gantt'}
				<div class="flex items-center gap-2">
					<Label id="gantt-scale-label" class={toolbarLabelClass}>Timeline scale</Label>
					<Tabs.Root
						value={ganttTimeScale}
						onValueChange={(v) => {
							if (v === 'week' || v === 'day') {
								ganttTimeScale = v;
							}
						}}
						aria-labelledby="gantt-scale-label"
					>
						<Tabs.List class={tabListClass} aria-label="Timeline scale">
							<Tabs.Trigger value="week" class={tabTriggerClass}>Week</Tabs.Trigger>
							<Tabs.Trigger value="day" class={tabTriggerClass}>Day</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				</div>
				<ButtonUi
					type="button"
					variant={linkMode ? 'primary' : 'secondary'}
					class="{controlSizeClass} px-4 {linkMode ? 'bg-accent text-white' : ''}"
					disabled={linkSaving}
					onclick={toggleLinkMode}
				>
					{linkMode ? 'Cancel linking' : 'Link tasks'}
				</ButtonUi>
			{/if}
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-hidden">
		{#if viewMode === 'list'}
			<div class="h-full min-h-0 overflow-auto">
				<TasksListView {tasks} {taskModuleSettings} onTaskClick={openEdit} />
			</div>
		{:else if viewMode === 'kanban'}
			<div class="h-full min-h-[24rem]">
				<TasksKanbanView
					{tasks}
					{taskModuleSettings}
					groupBy={kanbanGroupBy}
					onTaskClick={openEdit}
					onAddTaskWithDefaults={(defaults) =>
						openCreate({
							status: defaults.status as TaskStatus | undefined,
							priority: defaults.priority as TaskPriority | undefined
						})}
				/>
			</div>
		{:else}
			<div class="h-full min-h-[24rem]">
				<TasksGanttView
					{tasks}
					dependencies={taskDependencies}
					{taskModuleSettings}
					bind:timeScale={ganttTimeScale}
					{linkMode}
					{linkSourceId}
					{linkError}
					onTaskClick={openEdit}
					onScheduleChange={syncEditingTaskSchedule}
					onAddTask={() => openCreate()}
					onLinkSelect={handleLinkSelect}
				/>
			</div>
		{/if}
	</div>
</div>

<TasksTaskPanel
	bind:open={panelOpen}
	mode={panelMode}
	task={panelTask}
	{tasks}
	{teamMembers}
	onAttachmentsChange={syncTaskAttachments}
	onClose={closePanel}
/>

<TasksSettingsDialog bind:open={settingsOpen} settings={taskModuleSettings} />
