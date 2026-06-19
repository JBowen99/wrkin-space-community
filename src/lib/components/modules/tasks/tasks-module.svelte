<script lang="ts">
	import { untrack } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { deserialize } from '$app/forms';
	import type {
		LinkableTarget,
		TaskAttachmentRow,
		TaskBacklinkRow,
		TaskCommentRow,
		TaskDependencyRow,
		TaskModuleSettings,
		TaskRow,
		TeamMemberOption
	} from '$lib/server/tasks';
	import type { TaskTagRow } from '$lib/shared/task-links';
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
	import Combobox from '../../ui/combobox.svelte';
	import TabsUi from '../../ui/tabs.svelte';
	import type { GanttTimeScale } from '$lib/shared/tasks-gantt';

	type Props = {
		tasks: TaskRow[];
		teamMembers: TeamMemberOption[];
		taskModuleSettings: TaskModuleSettings;
		taskDependencies: TaskDependencyRow[];
		wrkspaceTags?: TaskTagRow[];
		linkableTargets?: LinkableTarget[];
		focusTaskId?: string | null;
		taskComments?: Record<string, TaskCommentRow[]>;
		taskBacklinks?: Record<string, TaskBacklinkRow[]>;
		settingsOpen?: boolean;
	};

	let {
		tasks: tasksFromServer,
		teamMembers,
		taskModuleSettings,
		taskDependencies,
		wrkspaceTags = [],
		linkableTargets = [],
		focusTaskId = null,
		taskComments = {},
		taskBacklinks = {},
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
	let filterTagIds = $state<string[]>([]);

	const tagFilterOptions = $derived(
		wrkspaceTags.map((tag) => ({ value: tag.id, label: tag.name }))
	);

	const filteredTasks = $derived.by(() => {
		if (filterTagIds.length === 0) return tasks;
		return tasks.filter((task) =>
			filterTagIds.every((tagId) => task.tags.some((t) => t.id === tagId))
		);
	});

	function syncTaskUrl(taskId: string | null) {
		const url = new URL(page.url);
		if (taskId) {
			url.searchParams.set('task', taskId);
		} else {
			url.searchParams.delete('task');
		}
		const search = url.searchParams.toString();
		goto(`${url.pathname}${search ? `?${search}` : ''}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	function openCreate(defaults?: { status?: TaskStatus; priority?: TaskPriority }) {
		panelMode = 'create';
		editingTask = null;
		createDefaults = defaults ?? {};
		panelOpen = true;
		syncTaskUrl(null);
	}

	function openEdit(task: TaskRow) {
		panelMode = 'edit';
		editingTask = task;
		createDefaults = {};
		panelOpen = true;
		syncTaskUrl(task.id);
	}

	function closePanel() {
		panelOpen = false;
		editingTask = null;
		createDefaults = {};
		syncTaskUrl(null);
	}

	$effect(() => {
		const id = focusTaskId;
		if (!id) return;
		if (untrack(() => panelOpen && editingTask?.id === id)) return;
		const task = tasks.find((t) => t.id === id);
		if (task) {
			panelMode = 'edit';
			editingTask = task;
			createDefaults = {};
			panelOpen = true;
		}
	});

	const panelComments = $derived(editingTask?.id ? (taskComments[editingTask.id] ?? []) : []);

	const panelBacklinks = $derived(editingTask?.id ? (taskBacklinks[editingTask.id] ?? []) : []);

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
			attachments: [],
			tags: [],
			links: [],
			commentCount: 0
		};
	});

	const viewTabs = [
		{ value: 'list', label: 'List' },
		{ value: 'kanban', label: 'Kanban' },
		{ value: 'gantt', label: 'Gantt' }
	];

	const controlSizeClass = 'h-11';

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
			<TabsUi
				tabs={viewTabs}
				value={viewMode}
				onValueChange={(v) => {
					if (v === 'list' || v === 'kanban' || v === 'gantt') {
						viewMode = v;
					}
				}}
				listClass={controlSizeClass}
				ariaLabel="Task views"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			{#if tagFilterOptions.length > 0}
				<div class="flex min-w-[12rem] items-center gap-2">
					<Label for="task-tag-filter" class={toolbarLabelClass}>Tags</Label>
					<Combobox
						id="task-tag-filter"
						bind:value={filterTagIds}
						options={tagFilterOptions}
						placeholder="Filter tags…"
						emptyMessage="No tags"
						class="{controlSizeClass} min-w-[10rem]"
					/>
				</div>
			{/if}
			{#if viewMode === 'list'}
				<p class="text-ink-muted text-sm">
					{filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
				</p>
				<ButtonUi type="button" class="{controlSizeClass} px-4" onclick={() => openCreate()}>
					Add task
				</ButtonUi>
			{:else if viewMode === 'kanban'}
				<div class="flex items-center gap-2">
					<Label for="kanban-group-by" class={toolbarLabelClass}>Group by</Label>
					<Select
						variant="inline"
						id="kanban-group-by"
						bind:value={kanbanGroupBy}
						class="{controlSizeClass} min-h-11 w-auto min-w-[7.5rem] px-3"
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
					<TabsUi
						tabs={[
							{ value: 'week', label: 'Week' },
							{ value: 'day', label: 'Day' }
						]}
						value={ganttTimeScale}
						onValueChange={(v) => {
							if (v === 'week' || v === 'day') {
								ganttTimeScale = v;
							}
						}}
						listClass={controlSizeClass}
						ariaLabel="Timeline scale"
					/>
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
				<TasksListView tasks={filteredTasks} {taskModuleSettings} onTaskClick={openEdit} />
			</div>
		{:else if viewMode === 'kanban'}
			<div class="h-full min-h-[24rem]">
				<TasksKanbanView
					tasks={filteredTasks}
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
					tasks={filteredTasks}
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
	{taskModuleSettings}
	{wrkspaceTags}
	{linkableTargets}
	taskComments={panelComments}
	taskBacklinks={panelBacklinks}
	onAttachmentsChange={syncTaskAttachments}
	onCommentPosted={() => invalidateAll()}
	onClose={closePanel}
/>

<TasksSettingsDialog bind:open={settingsOpen} settings={taskModuleSettings} />
