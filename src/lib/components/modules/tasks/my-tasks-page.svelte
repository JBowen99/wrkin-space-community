<script lang="ts">
	import ButtonUi from '../../ui/button.svelte';
	import Badge from '../../ui/badge.svelte';
	import Combobox from '../../ui/combobox.svelte';
	import Checkbox from '../../ui/checkbox.svelte';
	import type { MyTaskRow, MyTaskWrkspace } from '$lib/server/tasks';
	import {
		DEFAULT_TASK_MODULE_SETTINGS,
		resolveTaskColor,
		taskAccentStyle
	} from '$lib/shared/tasks-colors';
	import {
		TASK_STATUSES,
		TASK_PRIORITIES,
		TASK_STATUS_LABELS,
		TASK_PRIORITY_LABELS,
		formatTaskDatesSummary
	} from '$lib/shared/tasks';
	import TasksAssigneeAvatars from './tasks-assignee-avatars.svelte';

	type Props = {
		tasks: MyTaskRow[];
		wrkspaces: MyTaskWrkspace[];
	};

	let { tasks, wrkspaces }: Props = $props();

	let showCompleted = $state(false);
	let filterStatuses = $state<string[]>([]);
	let filterPriorities = $state<string[]>([]);
	let filterWrkspaceId = $state<string[]>([]);

	const statusOptions = $derived(
		TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))
	);
	const priorityOptions = $derived(
		TASK_PRIORITIES.map((p) => ({ value: p, label: TASK_PRIORITY_LABELS[p] }))
	);
	const wrkspaceOptions = $derived(
		wrkspaces.map((w) => ({
			value: w.wrkspaceId,
			label: `${w.teamName} / ${w.wrkspaceName}`
		}))
	);

	const filteredTasks = $derived.by(() => {
		return tasks.filter((task) => {
			if (!showCompleted && task.status === 'done') return false;
			if (filterStatuses.length > 0 && !filterStatuses.includes(task.status)) return false;
			if (filterPriorities.length > 0 && !filterPriorities.includes(task.priority))
				return false;
			if (filterWrkspaceId.length > 0) {
				const taskWrkspace = wrkspaces.find(
					(w) => w.teamSlug === task.teamSlug && w.wrkspaceSlug === task.wrkspaceSlug
				);
				if (!taskWrkspace || !filterWrkspaceId.includes(taskWrkspace.wrkspaceId))
					return false;
			}
			return true;
		});
	});

	const openCount = $derived(tasks.filter((t) => t.status !== 'done').length);
	const completedCount = $derived(tasks.filter((t) => t.status === 'done').length);

	function buildHref(task: MyTaskRow): string {
		return `/teams/${task.teamSlug}/wrkspaces/${task.wrkspaceSlug}/modules/${task.moduleId}?task=${task.id}`;
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="font-display text-2xl font-semibold text-ink">My Tasks</h1>
		<p class="mt-1 text-sm text-ink-muted">
			{tasks.length} task{tasks.length === 1 ? '' : 's'} assigned to you
			{openCount > 0 ? `(${openCount} open` : ''}
			{completedCount > 0 ? `, ${completedCount} completed)` : openCount > 0 ? ')' : ''}
		</p>
	</div>

	<div class="flex items-end gap-4 overflow-x-auto pb-1">
		<div class="flex w-[16rem] shrink-0 flex-col gap-1.5">
			<span class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
				Status
				{#if filterStatuses.length > 0}
					<span class="inline-flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold leading-none text-white">{filterStatuses.length}</span>
				{/if}
			</span>
			<Combobox
				bind:value={filterStatuses}
				options={statusOptions}
				placeholder="Filter status..."
				emptyMessage="No statuses"
				hideChips
			/>
		</div>
		<div class="flex w-[16rem] shrink-0 flex-col gap-1.5">
			<span class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
				Priority
				{#if filterPriorities.length > 0}
					<span class="inline-flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold leading-none text-white">{filterPriorities.length}</span>
				{/if}
			</span>
			<Combobox
				bind:value={filterPriorities}
				options={priorityOptions}
				placeholder="Filter priority..."
				emptyMessage="No priorities"
				hideChips
			/>
		</div>
		<div class="flex w-[16rem] shrink-0 flex-col gap-1.5">
			<span class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
				Wrkspace
				{#if filterWrkspaceId.length > 0}
					<span class="inline-flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold leading-none text-white">{filterWrkspaceId.length}</span>
				{/if}
			</span>
			<Combobox
				bind:value={filterWrkspaceId}
				options={wrkspaceOptions}
				placeholder="Filter wrkspace..."
				emptyMessage="No wrkspaces"
				disabled={wrkspaceOptions.length <= 1}
				hideChips
			/>
		</div>
		<div class="flex shrink-0 items-center gap-2 pb-2.5">
			<Checkbox
				id="show-completed"
				checked={showCompleted}
				onCheckedChange={(v) => (showCompleted = v)}
			/>
			<label for="show-completed" class="text-sm text-ink-muted">Show completed</label>
		</div>
	</div>

	{#if filteredTasks.length === 0}
		<p
			class="border-border text-ink-muted flex items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm"
		>
			{tasks.length === 0
				? 'No tasks assigned to you yet.'
				: 'No tasks match the current filters.'}
		</p>
	{:else}
		<div class="border-border overflow-x-auto rounded-xl border">
			<table class="w-full min-w-[740px] text-left text-sm">
				<thead>
					<tr
						class="border-border bg-surface/80 text-ink-muted border-b text-xs font-medium tracking-wide uppercase"
					>
						<th class="px-4 py-2.5">Title</th>
						<th class="px-4 py-2.5">Status</th>
						<th class="px-4 py-2.5">Priority</th>
						<th class="px-4 py-2.5">Progress</th>
						<th class="px-4 py-2.5">Wrkspace</th>
						<th class="px-4 py-2.5">Assignees</th>
						<th class="px-4 py-2.5">Dates</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredTasks as task (task.id)}
						{@const color = resolveTaskColor(task, DEFAULT_TASK_MODULE_SETTINGS)}
						<tr
							class="border-border/80 hover:bg-surface-hover/80 border-b transition last:border-0"
						>
							<td class="px-4 py-3">
								<ButtonUi
									href={buildHref(task)}
									variant="unstyled"
									class="text-ink hover:text-accent flex items-center gap-2 font-medium"
									style={taskAccentStyle(color)}
								>
									<span
										class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
										style="background-color: {color}"
										aria-hidden="true"
									></span>
									{task.title}
								</ButtonUi>
							</td>
							<td class="px-4 py-3">
								<span
									class="bg-surface-muted text-ink rounded-md px-2 py-0.5 text-xs font-medium"
								>
									{TASK_STATUS_LABELS[task.status]}
								</span>
							</td>
							<td class="px-4 py-3">
								<span class="text-ink-muted">{TASK_PRIORITY_LABELS[task.priority]}</span>
							</td>
							<td class="px-4 py-3">
								<div class="flex min-w-[5rem] items-center gap-2">
									<div
										class="bg-surface-inset h-1.5 flex-1 overflow-hidden rounded-full"
										role="progressbar"
										aria-valuenow={task.percentDone}
										aria-valuemin={0}
										aria-valuemax={100}
									>
										<div
											class="h-full rounded-full transition-[width]"
											style="width: {task.percentDone}%; background-color: {color}"
										></div>
									</div>
									<span class="text-ink-muted w-8 text-right text-xs tabular-nums"
										>{task.percentDone}%</span
									>
								</div>
							</td>
							<td class="px-4 py-3">
								<div class="flex flex-col gap-0.5">
									<span class="text-ink-muted text-xs">{task.teamName}</span>
									<span class="text-ink text-xs font-medium">{task.wrkspaceName}</span>
								</div>
							</td>
							<td class="px-4 py-3">
								<TasksAssigneeAvatars assignees={task.assignees} />
							</td>
							<td class="text-ink-muted px-4 py-3">
								{formatTaskDatesSummary(task)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
