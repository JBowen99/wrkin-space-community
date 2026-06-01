<script lang="ts">
	import { Button } from 'bits-ui';
	import { DndDraggable, DndDroppable, sortable } from '@horuse/svelte-dnd';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Add01Icon } from '@hugeicons/core-free-icons';
	import type { KanbanColumn } from '$lib/shared/tasks-kanban';
	import type { TaskModuleSettings, TaskRow } from '$lib/server/tasks';
	import type { TaskGroupBy, TaskPriority, TaskStatus } from '$lib/shared/tasks';
	import { taskPriorityLabel, taskStatusLabel } from '$lib/shared/tasks';
	import Tooltip from '../../ui/tooltip.svelte';
	import TasksTaskCard from './tasks-task-card.svelte';

	type Props = {
		column: KanbanColumn;
		groupBy: TaskGroupBy;
		taskModuleSettings: TaskModuleSettings;
		onTaskClick?: (task: TaskRow) => void;
		onAddTask?: (columnId: string) => void;
	};

	let { column, groupBy, taskModuleSettings, onTaskClick, onAddTask }: Props = $props();

	const columnLabel = $derived(
		groupBy === 'status'
			? taskStatusLabel(column.id as TaskStatus)
			: taskPriorityLabel(column.id as TaskPriority)
	);
</script>

<div
	class="flex h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-stone-100/80 shadow-sm"
>
	<div
		class="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200/80 bg-stone-200/50 px-3 py-2"
	>
		<div class="min-w-0">
			<h3 class="truncate text-sm font-semibold text-ink">{columnLabel}</h3>
		</div>
		<div class="flex shrink-0 items-center gap-0.5">
			<Tooltip
				text={column.tasks.length === 1
					? '1 task in this column'
					: `${column.tasks.length} tasks in this column`}
			>
				{#snippet trigger(props)}
					<span
						{...props}
						class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-300/60 px-1.5 text-[10px] font-medium text-ink-muted tabular-nums"
					>
						{column.tasks.length}
					</span>
				{/snippet}
			</Tooltip>
			<Tooltip text="Add task">
				{#snippet trigger(props)}
					<Button.Root
						{...props}
						type="button"
						class="flex size-7 items-center justify-center rounded-md text-ink-muted transition hover:bg-stone-300/60 hover:text-ink"
						aria-label="Add task"
						onclick={() => onAddTask?.(column.id)}
					>
						<HugeiconsIcon
							icon={Add01Icon}
							size={16}
							color="currentColor"
							strokeWidth={2}
							aria-hidden={true}
						/>
					</Button.Root>
				{/snippet}
			</Tooltip>
		</div>
	</div>

	<DndDroppable
		id={column.id}
		strategy={sortable()}
		accepts="task"
		class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
		spacing={8}
	>
		{#each column.tasks as task, taskIndex (task.id)}
			<DndDraggable
				id={task.id}
				type="task"
				position={taskIndex}
				class="cursor-grab active:cursor-grabbing"
			>
				<TasksTaskCard {task} {taskModuleSettings} onclick={onTaskClick} />
			</DndDraggable>
		{/each}
	</DndDroppable>
</div>
