<script lang="ts">
	import type { ReportsModulePreviewSummary } from '$lib/shared/reports-preview';
	import ReportsPreviewBadge from './reports-preview-badge.svelte';
	import ReportsPreviewDonut from './reports-preview-donut.svelte';

	type Props = {
		preview: ReportsModulePreviewSummary;
	};

	let { preview }: Props = $props();
</script>

<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
	<ReportsPreviewBadge reportType={preview.reportType} />

	{#if !preview.hasSources}
		<p class="text-ink-muted text-xs">Link modules to build the snapshot.</p>
	{:else}
		<div class="flex min-h-0 flex-1 flex-col gap-2.5">
			{#if preview.completionPercent !== null}
				<div class="flex items-center justify-between gap-3">
					<ReportsPreviewDonut percent={preview.completionPercent} size={64} />
					<div class="min-w-0 flex-1 text-right">
						<p class="font-display text-ink text-2xl font-semibold tabular-nums">
							{preview.completionPercent}%
						</p>
						<p class="text-ink-muted text-xs">complete</p>
					</div>
				</div>
			{/if}

			<div class="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
				{#if preview.openTasks !== null}
					<div class="border-border/70 bg-surface-raised rounded-lg border px-2.5 py-2">
						<p class="text-ink-muted text-[10px]">Open</p>
						<p class="text-ink text-lg font-semibold tabular-nums">{preview.openTasks}</p>
					</div>
				{/if}
				{#if preview.overdueCount !== null}
					<div class="border-border/70 bg-surface-raised rounded-lg border px-2.5 py-2">
						<p class="text-ink-muted text-[10px]">Overdue</p>
						<p class="text-danger text-lg font-semibold tabular-nums">{preview.overdueCount}</p>
					</div>
				{/if}
				{#if preview.upcomingCount !== null && preview.upcomingCount > 0}
					<div class="border-border/70 bg-surface-raised col-span-2 rounded-lg border px-2.5 py-2">
						<p class="text-ink-muted text-[10px]">Upcoming</p>
						<p class="text-ink text-lg font-semibold tabular-nums">{preview.upcomingCount}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
