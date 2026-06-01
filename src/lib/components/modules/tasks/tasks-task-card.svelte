<script lang="ts">
	import { Button } from 'bits-ui';
	import type { TaskModuleSettings, TaskRow } from '$lib/server/tasks';
	import { resolveTaskColor, taskAccentStyle } from '$lib/shared/tasks-colors';
	import { formatTaskDatesSummary, taskPriorityLabel } from '$lib/shared/tasks';
	import TasksAssigneeAvatars from './tasks-assignee-avatars.svelte';

	type Props = {
		task: TaskRow;
		taskModuleSettings: TaskModuleSettings;
		onclick?: (task: TaskRow) => void;
	};

	let { task, taskModuleSettings, onclick }: Props = $props();

	const dateLabel = $derived.by(() => {
		const summary = formatTaskDatesSummary(task);
		return summary === '—' ? null : summary;
	});
	const accentColor = $derived(resolveTaskColor(task, taskModuleSettings));
	const accentStyle = $derived(taskAccentStyle(accentColor));
</script>

<Button.Root
	type="button"
	class="w-full rounded-lg border border-t-4 border-border bg-surface-raised p-3 text-left shadow-sm transition hover:border-accent/30 hover:shadow"
	style={accentStyle}
	onclick={() => onclick?.(task)}
>
	<p class="text-sm font-medium text-ink">{task.title}</p>
	{#if task.description.trim()}
		<p class="mt-1 line-clamp-2 text-xs text-ink-muted">{task.description}</p>
	{/if}
	{#if task.percentDone > 0}
		<div
			class="mt-2 h-1 overflow-hidden rounded-full bg-stone-200"
			role="progressbar"
			aria-valuenow={task.percentDone}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div
				class="h-full rounded-full"
				style="width: {task.percentDone}%; background-color: {accentColor}"
			></div>
		</div>
	{/if}
	<div class="mt-2 flex flex-wrap items-center gap-2">
		<span
			class="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
			style="background-color: {accentColor}"
		>
			{taskPriorityLabel(task.priority)}
		</span>
		{#if dateLabel}
			<span class="text-[10px] text-ink-muted">{dateLabel}</span>
		{/if}
		<TasksAssigneeAvatars assignees={task.assignees} class="ml-auto" />
	</div>
</Button.Root>
