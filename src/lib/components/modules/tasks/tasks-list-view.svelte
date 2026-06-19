<script lang="ts">
	import ButtonUi from '../../ui/button.svelte';
	import Badge from '../../ui/badge.svelte';
	import type { TaskModuleSettings, TaskRow } from '$lib/server/tasks';
	import { resolveTaskColor, taskAccentStyle } from '$lib/shared/tasks-colors';
	import { formatTaskDatesSummary, taskPriorityLabel, taskStatusLabel } from '$lib/shared/tasks';
	import TasksAssigneeAvatars from './tasks-assignee-avatars.svelte';
	import BookmarkToggle from '../../bookmarks/bookmark-toggle.svelte';
	import { getBookmarkContext } from '../../bookmarks/bookmark-context.svelte';

	type Props = {
		tasks: TaskRow[];
		taskModuleSettings: TaskModuleSettings;
		onTaskClick: (task: TaskRow) => void;
	};

	let { tasks, taskModuleSettings, onTaskClick }: Props = $props();

	const bmCtx = getBookmarkContext();
</script>

<div class="flex h-full min-h-0 flex-col">
	{#if tasks.length === 0}
		<p
			class="border-border text-ink-muted flex flex-1 items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm"
		>
			No tasks yet. Use Add task above to get started.
		</p>
	{:else}
		<div class="border-border overflow-x-auto rounded-xl border">
			<table class="w-full min-w-[640px] text-left text-sm">
				<thead>
					<tr
						class="border-border bg-surface/80 text-ink-muted border-b text-xs font-medium tracking-wide uppercase"
					>
						<th class="px-4 py-2.5">Title</th>
						<th class="px-4 py-2.5">Status</th>
						<th class="px-4 py-2.5">Priority</th>
						<th class="px-4 py-2.5">Progress</th>
						<th class="px-4 py-2.5">Tags</th>
						<th class="px-4 py-2.5">Assignees</th>
						<th class="px-4 py-2.5">Dates</th>
						<th class="w-10 px-2 py-2.5"></th>
					</tr>
				</thead>
				<tbody>
					{#each tasks as task (task.id)}
						{@const color = resolveTaskColor(task, taskModuleSettings)}
						<tr
							class="border-border/80 hover:bg-surface-hover/80 border-b transition last:border-0"
						>
							<td class="px-4 py-3">
								<ButtonUi
									type="button"
									variant="unstyled"
									class="text-ink hover:text-accent flex items-center gap-2 font-medium"
									style={taskAccentStyle(color)}
									onclick={() => onTaskClick(task)}
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
								<span class="bg-surface-muted text-ink rounded-md px-2 py-0.5 text-xs font-medium">
									{taskStatusLabel(task.status)}
								</span>
							</td>
							<td class="px-4 py-3">
								<span class="text-ink-muted">{taskPriorityLabel(task.priority)}</span>
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
								{#if task.tags.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each task.tags as tag (tag.id)}
											<Badge variant="neutral">{tag.name}</Badge>
										{/each}
									</div>
								{:else}
									<span class="text-ink-muted">—</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								<TasksAssigneeAvatars assignees={task.assignees} />
							</td>
							<td class="text-ink-muted px-4 py-3">
								{formatTaskDatesSummary(task)}
							</td>
							<td class="px-2 py-3">
								<BookmarkToggle
									targetType="taskItem"
									targetId={task.id}
									label={task.title}
									size={16}
									class="transition {bmCtx?.isBookmarked(task.id)
										? 'opacity-100'
										: 'opacity-0 group-hover:opacity-100'}"
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
