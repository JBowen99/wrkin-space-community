<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { SvelteGantt, SvelteGanttTable, SvelteGanttDependencies } from 'svelte-gantt/svelte';
	import type { TaskDependencyRow, TaskModuleSettings, TaskRow } from '$lib/server/tasks';
	import { buildGanttTaskColorCss, markGanttTaskBar } from '$lib/shared/tasks-colors';
	import {
		GANTT_TABLE_HEADERS,
		buildGanttScaleConfig,
		buildTasksGanttData,
		type GanttTimeScale
	} from '$lib/shared/tasks-gantt';
	import { wrkinGanttDateAdapter } from '$lib/shared/gantt-date-adapter';
	import type { GanttTaskModel } from '$lib/shared/tasks-gantt';

	type Props = {
		tasks: TaskRow[];
		dependencies: TaskDependencyRow[];
		taskModuleSettings: TaskModuleSettings;
		timeScale: GanttTimeScale;
		linkMode?: boolean;
		linkSourceId?: string | null;
		linkError?: string | null;
		onTaskClick?: (task: TaskRow) => void;
		onScheduleChange?: (taskId: string, startsAt: Date, dueAt: Date) => void;
		onLinkSelect?: (taskId: string) => void;
	};

	let {
		tasks,
		dependencies,
		taskModuleSettings,
		timeScale,
		linkMode = false,
		linkSourceId = null,
		linkError = null,
		onTaskClick,
		onScheduleChange,
		onLinkSelect
	}: Props = $props();

	let gantt = $state<InstanceType<typeof SvelteGantt> | undefined>();
	let ganttHost = $state<HTMLDivElement | undefined>();
	let scheduleSaving = $state(false);

	const ganttData = $derived(buildTasksGanttData(tasks, dependencies, taskModuleSettings));
	const scaleConfig = $derived(buildGanttScaleConfig(timeScale, ganttData));
	const tasksById = $derived(new Map(tasks.map((t) => [t.id, t])));
	const colorByTaskId = $derived(
		new Map(ganttData.tasks.map((t) => [String(t.id), t.color ?? '#64748b']))
	);
	const ganttColorCss = $derived(buildGanttTaskColorCss(colorByTaskId));

	const options = $derived({
		rows: ganttData.rows,
		tasks: ganttData.tasks,
		dependencies: ganttData.dependencies,
		from: scaleConfig.from,
		to: scaleConfig.to,
		tableWidth: 240,
		tableHeaders: [...GANTT_TABLE_HEADERS],
		ganttTableModules: [SvelteGanttTable],
		ganttBodyModules: [SvelteGanttDependencies],
		reflectOnParentRows: false,
		reflectOnChildRows: false,
		layout: 'pack' as const,
		rowHeight: 44,
		headers: scaleConfig.headers,
		zoomLevels: [
			{
				headers: scaleConfig.headers,
				minWidth: scaleConfig.minWidth,
				fitWidth: scaleConfig.fitWidth
			}
		],
		classes: 'wrkin-gantt',
		highlightedDurations: scaleConfig.highlightedDurations,
		highlightColor: scaleConfig.highlightColor,
		useCanvasColumns: scaleConfig.useCanvasColumns,
		columnUnit: scaleConfig.columnUnit,
		columnOffset: scaleConfig.columnOffset,
		minWidth: scaleConfig.minWidth,
		fitWidth: scaleConfig.fitWidth,
		magnetUnit: scaleConfig.magnetUnit,
		magnetOffset: scaleConfig.magnetOffset,
		dateAdapter: wrkinGanttDateAdapter,
		taskElementHook: (node: HTMLElement, model: GanttTaskModel) => {
			const taskId = String(model.id);
			const color = colorByTaskId.get(taskId);
			if (color) {
				markGanttTaskBar(node, color);
			}
			if (linkMode && linkSourceId === taskId) {
				node.classList.add('task-gantt-link-source');
			}
			return {
				update(updated: GanttTaskModel) {
					const id = String(updated.id);
					const c = colorByTaskId.get(id);
					if (c) {
						markGanttTaskBar(node, c);
					}
					node.classList.toggle('task-gantt-link-source', linkMode && linkSourceId === id);
				},
				destroy() {}
			};
		}
	});

	async function persistSchedule(taskId: string, from: number, to: number) {
		scheduleSaving = true;
		const formData = new FormData();
		formData.set('taskId', taskId);
		formData.set('startsAt', new Date(from).toISOString());
		formData.set('dueAt', new Date(to).toISOString());

		try {
			const response = await fetch('?/updateTaskSchedule', { method: 'POST', body: formData });
			const text = await response.text();
			const result = deserialize(text);
			if (result.type === 'failure') return;
			await invalidateAll();
		} finally {
			scheduleSaving = false;
		}
	}

	$effect(() => {
		const instance = gantt;
		const isLinkMode = linkMode;
		if (!instance || !browser) return;

		const offChanged = instance.api.tasks.on.changed(([detail]) => {
			const { task } = detail;
			const id = String(task.model.id);
			if (String(task.model.resourceId) !== id) return;
			if (!tasksById.has(id)) return;
			const startsAt = new Date(task.model.from);
			const dueAt = new Date(task.model.to);
			onScheduleChange?.(id, startsAt, dueAt);
			void persistSchedule(id, task.model.from, task.model.to);
		});

		const offChange = instance.api.tasks.on.change(([detail]) => {
			const { task } = detail;
			const id = String(task.model.id);
			if (String(task.model.resourceId) !== id) return;
			if (!tasksById.has(id)) return;
			onScheduleChange?.(id, new Date(task.model.from), new Date(task.model.to));
		});

		const offDblClick = instance.api.tasks.on.dblclicked(([svelteTask]) => {
			if (isLinkMode) return;
			const rowTask = tasksById.get(String(svelteTask.model.id));
			if (rowTask) onTaskClick?.(rowTask);
		});

		const offSelect = instance.api.tasks.on.select(([svelteTask]) => {
			const id = String(svelteTask.model.id);
			const rowTask = tasksById.get(id);
			if (!rowTask) return;
			if (isLinkMode) {
				onLinkSelect?.(id);
			} else {
				onTaskClick?.(rowTask);
			}
		});

		return () => {
			offChanged();
			offChange();
			offDblClick();
			offSelect();
		};
	});

	/** Table row clicks select the row in svelte-gantt but do not raise tasks.on.select. */
	$effect(() => {
		const host = ganttHost;
		const isLinkMode = linkMode;
		const taskMap = tasksById;
		if (!host || !browser) return;

		function findTableRowFromClick(e: MouseEvent): HTMLElement | null {
			for (const node of e.composedPath()) {
				if (
					node instanceof HTMLElement &&
					node.classList.contains('sg-table-row') &&
					node.hasAttribute('data-row-id')
				) {
					return node;
				}
			}
			return null;
		}

		function onTableRowClick(e: MouseEvent) {
			const tableRow = findTableRowFromClick(e);
			if (!tableRow) return;
			const id = tableRow.getAttribute('data-row-id');
			if (!id) return;
			const rowTask = taskMap.get(id);
			if (!rowTask) return;
			if (isLinkMode) {
				onLinkSelect?.(id);
			} else {
				onTaskClick?.(rowTask);
			}
		}

		// svelte-gantt stops click propagation on .sg-gantt; capture reaches us first.
		host.addEventListener('click', onTableRowClick, true);
		return () => host.removeEventListener('click', onTableRowClick, true);
	});
</script>

{#if browser}
	<div bind:this={ganttHost} class="wrkin-gantt-host relative h-full min-h-[28rem] w-full">
		{#if ganttColorCss}
			<!-- Colors via stylesheet so drag position updates don't wipe inline background-color -->
			{@html `<style id="wrkin-gantt-task-colors">${ganttColorCss}</style>`}
		{/if}
		{#if scheduleSaving}
			<p
				class="absolute top-2 right-2 z-10 rounded-md bg-surface-raised/95 px-2 py-1 text-xs text-ink-muted shadow-sm"
			>
				Saving…
			</p>
		{/if}
		{#if linkMode}
			<p
				class="absolute top-2 left-2 z-10 max-w-xs rounded-md px-2 py-1 text-xs shadow-sm {linkError
					? 'bg-red-50 text-red-800'
					: 'bg-accent/90 text-white'}"
			>
				{#if linkError}
					{linkError}
				{:else if linkSourceId}
					Select the task that starts after the highlighted one.
				{:else}
					Select the task that must finish first (predecessor).
				{/if}
			</p>
		{/if}
		{#key timeScale}
			<SvelteGantt bind:this={gantt} {...options} />
		{/key}
	</div>
{:else}
	<div
		class="flex h-64 items-center justify-center rounded-xl border border-dashed border-border text-sm text-ink-muted"
	>
		Loading timeline…
	</div>
{/if}

<style>
	:global(.wrkin-gantt-host .sg-gantt) {
		border: 1px solid var(--color-border, #e7e5e4);
		border-radius: 0.75rem;
		overflow: hidden;
		background: var(--color-surface-raised, #fff);
		height: 100%;
	}

	:global(.wrkin-gantt-host .sg-task) {
		border-radius: 8px;
		font-size: 12px;
		overflow: hidden;
	}

	:global(.wrkin-gantt-host .sg-task .sg-task-background) {
		opacity: 1;
	}

	:global(.wrkin-gantt-host .sg-task.task-gantt-colored:hover) {
		filter: brightness(0.92);
	}

	:global(.wrkin-gantt-host .task-gantt-bar-done) {
		opacity: 0.65;
	}

	:global(.wrkin-gantt-host .sg-task.moving.task-gantt-colored) {
		opacity: 0.85;
	}

	:global(.wrkin-gantt-host .task-gantt-link-source) {
		outline: 2px solid var(--color-accent, #2563eb);
		outline-offset: 1px;
	}

	:global(.wrkin-gantt-host .sg-table-header-cell),
	:global(.wrkin-gantt-host .sg-table-cell) {
		font-size: 12px;
	}

	:global(.wrkin-gantt-host .sg-table-row) {
		cursor: pointer;
	}
</style>
