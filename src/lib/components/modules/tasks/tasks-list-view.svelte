<script lang="ts">
	import { Button } from 'bits-ui';
	import type { TaskModuleSettings, TaskRow } from '$lib/server/tasks';
	import { resolveTaskColor, taskAccentStyle } from '$lib/shared/tasks-colors';
	import { formatTaskDatesSummary, taskPriorityLabel, taskStatusLabel } from '$lib/shared/tasks';
	import TasksAssigneeAvatars from './tasks-assignee-avatars.svelte';

	type Props = {
		tasks: TaskRow[];
		taskModuleSettings: TaskModuleSettings;
		onTaskClick: (task: TaskRow) => void;
	};

	let { tasks, taskModuleSettings, onTaskClick }: Props = $props();
</script>

<div class="flex h-full min-h-0 flex-col">
	{#if tasks.length === 0}
		<p
			class="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted"
		>
			No tasks yet. Use Add task above to get started.
		</p>
	{:else}
		<div class="overflow-x-auto rounded-xl border border-border">
			<table class="w-full min-w-[640px] text-left text-sm">
				<thead>
					<tr
						class="border-b border-border bg-surface/80 text-xs font-medium tracking-wide text-ink-muted uppercase"
					>
						<th class="px-4 py-2.5">Title</th>
						<th class="px-4 py-2.5">Status</th>
						<th class="px-4 py-2.5">Priority</th>
						<th class="px-4 py-2.5">Progress</th>
						<th class="px-4 py-2.5">Assignees</th>
						<th class="px-4 py-2.5">Dates</th>
					</tr>
				</thead>
				<tbody>
					{#each tasks as task (task.id)}
						{@const color = resolveTaskColor(task, taskModuleSettings)}
						<tr class="border-b border-border/80 transition last:border-0 hover:bg-stone-50/80">
							<td class="px-4 py-3">
								<Button.Root
									type="button"
									class="flex items-center gap-2 font-medium text-ink hover:text-accent"
									style={taskAccentStyle(color)}
									onclick={() => onTaskClick(task)}
								>
									<span
										class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
										style="background-color: {color}"
										aria-hidden="true"
									></span>
									{task.title}
								</Button.Root>
							</td>
							<td class="px-4 py-3">
								<span class="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-ink">
									{taskStatusLabel(task.status)}
								</span>
							</td>
							<td class="px-4 py-3">
								<span class="text-ink-muted">{taskPriorityLabel(task.priority)}</span>
							</td>
							<td class="px-4 py-3">
								<div class="flex min-w-[5rem] items-center gap-2">
									<div
										class="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200"
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
									<span class="w-8 text-right text-xs text-ink-muted tabular-nums"
										>{task.percentDone}%</span
									>
								</div>
							</td>
							<td class="px-4 py-3">
								<TasksAssigneeAvatars assignees={task.assignees} />
							</td>
							<td class="px-4 py-3 text-ink-muted">
								{formatTaskDatesSummary(task)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
