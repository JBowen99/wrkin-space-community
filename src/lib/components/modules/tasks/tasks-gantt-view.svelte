<script lang="ts">
	import type { TaskDependencyRow, TaskModuleSettings, TaskRow } from '$lib/server/tasks';
	import type { GanttTimeScale } from '$lib/shared/tasks-gantt';
	import ButtonUi from '../../ui/button.svelte';
	import TasksGanttChart from './tasks-gantt-chart.svelte';

	type Props = {
		tasks: TaskRow[];
		dependencies: TaskDependencyRow[];
		taskModuleSettings: TaskModuleSettings;
		timeScale: GanttTimeScale;
		linkMode?: boolean;
		linkSourceId?: string | null;
		linkError?: string | null;
		onTaskClick: (task: TaskRow) => void;
		onScheduleChange?: (taskId: string, startsAt: Date, dueAt: Date) => void;
		onAddTask: () => void;
		onLinkSelect: (taskId: string) => void;
	};

	let {
		tasks,
		dependencies,
		taskModuleSettings,
		timeScale = $bindable(),
		linkMode = false,
		linkSourceId = null,
		linkError = null,
		onTaskClick,
		onScheduleChange,
		onAddTask,
		onLinkSelect
	}: Props = $props();
</script>

<div class="flex h-full min-h-[24rem] flex-col">
	{#if tasks.length === 0}
		<div
			class="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-sm text-ink-muted"
		>
			<p>No scheduled tasks yet. Add a task with start and due dates to see the timeline.</p>
			<ButtonUi type="button" onclick={onAddTask}>Add task</ButtonUi>
		</div>
	{:else}
		<div class="min-h-0 flex-1">
			<TasksGanttChart
				{tasks}
				{dependencies}
				{taskModuleSettings}
				{timeScale}
				{linkMode}
				{linkSourceId}
				{linkError}
				{onTaskClick}
				{onScheduleChange}
				{onLinkSelect}
			/>
		</div>
	{/if}
</div>
