<script lang="ts">
	import type { ReportsModulePreviewProgress } from '$lib/shared/reports-preview';
	import { TASK_STATUS_LABELS, isTaskStatus } from '$lib/shared/tasks';
	import ReportsPreviewBadge from './reports-preview-badge.svelte';
	import ReportsPreviewDonut from './reports-preview-donut.svelte';

	type Props = {
		preview: ReportsModulePreviewProgress;
	};

	let { preview }: Props = $props();
</script>

<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
	<ReportsPreviewBadge reportType={preview.reportType} />

	{#if !preview.hasSources}
		<p class="text-ink-muted text-xs">Link task modules to see completion.</p>
	{:else if preview.done + preview.open === 0}
		<p class="text-ink-muted text-xs">No tasks in linked modules yet.</p>
	{:else}
		<div class="flex min-h-0 flex-1 flex-col gap-3">
			<div class="flex items-center justify-between gap-3">
				<ReportsPreviewDonut percent={preview.completionPercent} size={72} />
				<div class="min-w-0 flex-1 text-right">
					<p class="font-display text-ink text-2xl font-semibold tabular-nums">
						{preview.completionPercent}%
					</p>
					<p class="text-ink-muted text-xs">complete</p>
					<p class="text-ink-muted mt-1 text-[10px]">
						{preview.done} done · {preview.open} open
					</p>
				</div>
			</div>

			{#if preview.byStatus.length > 0}
				<ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
					{#each preview.byStatus as row (row.status)}
						<li class="flex items-center justify-between gap-2 text-[10px]">
							<span class="text-ink-muted truncate">
								{isTaskStatus(row.status) ? TASK_STATUS_LABELS[row.status] : row.status}
							</span>
							<span class="text-ink shrink-0 font-medium tabular-nums">{row.count}</span>
						</li>
					{/each}
				</ul>
			{/if}

			{#if preview.overdueCount > 0}
				<p class="bg-danger-muted text-danger w-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
					{preview.overdueCount} overdue
				</p>
			{/if}
		</div>
	{/if}
</div>
