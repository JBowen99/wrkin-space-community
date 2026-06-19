<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { DndController, DndProvider } from '@horuse/svelte-dnd';
	import type { TaskModuleSettings, TaskRow } from '$lib/server/tasks';
	import type { TaskGroupBy } from '$lib/shared/tasks';
	import {
		buildKanbanColumns,
		cloneKanbanColumns,
		moveTaskInKanban,
		type KanbanColumn
	} from '$lib/shared/tasks-kanban';
	import TasksKanbanColumn from './tasks-kanban-column.svelte';

	type Props = {
		tasks: TaskRow[];
		taskModuleSettings: TaskModuleSettings;
		groupBy: TaskGroupBy;
		onTaskClick: (task: TaskRow) => void;
		onAddTaskWithDefaults: (defaults: { status?: string; priority?: string }) => void;
	};

	let { tasks, taskModuleSettings, groupBy, onTaskClick, onAddTaskWithDefaults }: Props = $props();

	let columns = $state<KanbanColumn[]>([]);

	$effect(() => {
		columns = buildKanbanColumns(tasks, groupBy);
	});

	const controller = new DndController();

	let scrollEl = $state<HTMLElement | undefined>();

	$effect(() => {
		void columns;
		void tick();
	});

	async function postAction(action: string, fields: Record<string, string>): Promise<boolean> {
		const formData = new FormData();
		for (const [key, value] of Object.entries(fields)) {
			formData.set(key, value);
		}

		const response = await fetch(`?/${action}`, {
			method: 'POST',
			body: formData
		});

		const text = await response.text();
		const result = deserialize(text);

		if (result.type === 'failure') {
			return false;
		}

		await invalidateAll();
		return true;
	}

	onMount(() => {
		const unsubscribe = controller.onDrop(async ({ item, source, target }) => {
			if (source.id === target.id) return;

			const previous = cloneKanbanColumns(columns);
			columns = moveTaskInKanban(columns, item.id, target.id, target.position, groupBy);

			const fields: Record<string, string> = {
				taskId: item.id,
				position: String(target.position)
			};

			if (groupBy === 'status') {
				fields.status = target.id;
			} else {
				fields.priority = target.id;
			}

			const ok = await postAction('moveTask', fields);
			if (!ok) columns = previous;
		});

		return unsubscribe;
	});
</script>

<div bind:this={scrollEl} class="scrollbar-hidden mt-2 min-h-[24rem] flex-1 overflow-x-auto">
	<DndProvider {controller}>
		<div class="flex h-full w-max items-stretch gap-4 pb-2">
			{#each columns as column (column.id)}
				<TasksKanbanColumn
					{column}
					{groupBy}
					{taskModuleSettings}
					{onTaskClick}
					onAddTask={(columnId) =>
						onAddTaskWithDefaults(
							groupBy === 'status' ? { status: columnId } : { priority: columnId }
						)}
				/>
			{/each}
		</div>
	</DndProvider>
</div>
