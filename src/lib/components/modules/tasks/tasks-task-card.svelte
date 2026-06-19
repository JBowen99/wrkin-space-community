<script lang="ts">
	import ButtonUi from '../../ui/button.svelte';
	import Badge from '../../ui/badge.svelte';
	import type { TaskModuleSettings, TaskRow } from '$lib/server/tasks';
	import { resolveTaskColor, taskAccentStyle } from '$lib/shared/tasks-colors';
	import { formatTaskDatesSummary, taskPriorityLabel } from '$lib/shared/tasks';
	import TasksAssigneeAvatars from './tasks-assignee-avatars.svelte';
	import BookmarkToggle from '../../bookmarks/bookmark-toggle.svelte';
	import { getBookmarkContext } from '../../bookmarks/bookmark-context.svelte';

	type Props = {
		task: TaskRow;
		taskModuleSettings: TaskModuleSettings;
		onclick?: (task: TaskRow) => void;
	};

	let { task, taskModuleSettings, onclick }: Props = $props();

	const bmCtx = getBookmarkContext();

	const isBookmarked = $derived(bmCtx?.isBookmarked(task.id) ?? false);

	const dateLabel = $derived.by(() => {
		const summary = formatTaskDatesSummary(task);
		return summary === '—' ? null : summary;
	});
	const accentColor = $derived(resolveTaskColor(task, taskModuleSettings));
	const accentStyle = $derived(taskAccentStyle(accentColor));
</script>

<ButtonUi
	type="button"
	variant="unstyled"
	class="border-border bg-surface-raised hover:border-accent/30 w-full rounded-lg border border-t-4 p-3 text-left shadow-sm transition hover:shadow"
	style={accentStyle}
	onclick={() => onclick?.(task)}
>
	<p class="text-ink text-sm font-medium">{task.title}</p>
	{#if task.description.trim()}
		<p class="text-ink-muted mt-1 line-clamp-2 text-xs">{task.description}</p>
	{/if}
	{#if task.percentDone > 0}
		<div
			class="bg-surface-inset mt-2 h-1 overflow-hidden rounded-full"
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
		{#if task.tags.length > 0}
			{#each task.tags.slice(0, 2) as tag (tag.id)}
				<Badge variant="neutral">{tag.name}</Badge>
			{/each}
			{#if task.tags.length > 2}
				<span class="text-ink-muted text-[10px]">+{task.tags.length - 2}</span>
			{/if}
		{/if}
		{#if task.commentCount > 0}
			<span class="bg-surface-muted text-ink-muted rounded-full px-1.5 py-0.5 text-[10px]">
				{task.commentCount} comment{task.commentCount === 1 ? '' : 's'}
			</span>
		{/if}
		{#if dateLabel}
			<span class="text-ink-muted text-[10px]">{dateLabel}</span>
		{/if}
		<BookmarkToggle
			targetType="taskItem"
			targetId={task.id}
			label={task.title}
			size={14}
			class="transition {isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}"
		/>
		<TasksAssigneeAvatars assignees={task.assignees} class="ml-auto" />
	</div>
</ButtonUi>
