<script lang="ts">
	import type { ModulePreview } from '$lib/server/modules';
	import { DEFAULT_PRIORITY_COLORS } from '$lib/shared/tasks-colors';
	import { isTaskPriority, isTaskStatus, taskPriorityLabel, taskStatusLabel } from '$lib/shared/tasks';
	import PreviewSkeleton from './preview-skeleton.svelte';

	type Props = {
		preview: Extract<ModulePreview, { type: 'tasks' }>;
	};

	let { preview }: Props = $props();

	function accentColor(priority: string): string {
		if (isTaskPriority(priority)) return DEFAULT_PRIORITY_COLORS[priority];
		return DEFAULT_PRIORITY_COLORS.medium;
	}

	function statusLabel(status: string): string {
		if (isTaskStatus(status)) return taskStatusLabel(status);
		return status;
	}

	function priorityLabel(priority: string): string {
		if (isTaskPriority(priority)) return taskPriorityLabel(priority);
		return priority;
	}
</script>

{#if preview.openCount === 0 && preview.recent.length === 0}
	<PreviewSkeleton variant="tasks" />
{:else}
	<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
		{#if preview.openCount > 0}
			<p
				class="mb-1.5 inline-flex w-fit shrink-0 rounded-full bg-accent-muted/50 px-2 py-0.5 text-xs font-medium text-accent"
			>
				{preview.openCount} open task{preview.openCount === 1 ? '' : 's'}
			</p>
		{/if}
		{#if preview.recent.length > 0}
			<ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
				{#each preview.recent as item, index (index)}
					{@const color = accentColor(item.priority)}
					{@const done = item.status === 'done'}
					<li
						class="flex min-w-0 items-start gap-2 rounded-lg border border-t-[3px] border-border/80 bg-white px-2 py-1.5 shadow-sm dark:bg-surface"
						style="border-top-color: {color}"
						aria-hidden="true"
					>
						<span
							class="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 {done
								? 'border-transparent'
								: 'border-border/80 bg-surface'}"
							style={done ? `background-color: ${color}; border-color: ${color}` : undefined}
							aria-hidden="true"
						>
							{#if done}
								<svg
									class="h-2 w-2 text-white"
									viewBox="0 0 12 12"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M2 6l3 3 5-5" />
								</svg>
							{/if}
						</span>
						<div class="min-w-0 flex-1 py-px">
							<p
								class="truncate text-xs leading-snug font-medium {done
									? 'text-ink-muted line-through'
									: 'text-ink'}"
							>
								{item.title}
							</p>
							<p class="mt-0.5 truncate text-[10px] text-ink-muted">
								{priorityLabel(item.priority)}
								<span aria-hidden="true"> · </span>
								{statusLabel(item.status)}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
