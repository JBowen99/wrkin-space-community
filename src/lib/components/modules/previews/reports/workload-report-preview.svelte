<script lang="ts">
	import type { ReportsModulePreviewWorkload } from '$lib/shared/reports-preview';
	import ReportsPreviewBadge from './reports-preview-badge.svelte';

	type Props = {
		preview: ReportsModulePreviewWorkload;
	};

	let { preview }: Props = $props();

	const maxOpen = $derived(
		Math.max(1, ...preview.byAssignee.map((row) => row.open))
	);
</script>

<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
	<ReportsPreviewBadge reportType={preview.reportType} />

	<div class="mb-2 flex items-end justify-between gap-3">
		<div>
			<p class="font-display text-ink text-2xl font-semibold tabular-nums">
				{preview.totals.open}
			</p>
			<p class="text-ink-muted text-xs">open tasks</p>
		</div>
		<div class="flex flex-col items-end gap-1">
			{#if preview.totals.overdue > 0}
				<span class="bg-danger-muted text-danger rounded-full px-2 py-0.5 text-[10px] font-medium">
					{preview.totals.overdue} overdue
				</span>
			{/if}
			{#if preview.totals.dueThisWeek > 0}
				<span class="bg-warning-muted text-warning rounded-full px-2 py-0.5 text-[10px] font-medium">
					{preview.totals.dueThisWeek} due soon
				</span>
			{/if}
		</div>
	</div>

	{#if !preview.hasSources}
		<p class="text-ink-muted text-xs">Link task modules to compare load.</p>
	{:else if preview.byAssignee.length === 0}
		<p class="text-ink-muted text-xs">No open assignments yet.</p>
	{:else}
		<ul class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
			{#each preview.byAssignee as row (row.name)}
				<li class="min-w-0">
					<div class="mb-0.5 flex items-center justify-between gap-2 text-[10px]">
						<span class="text-ink-muted truncate">{row.name}</span>
						<span class="text-ink shrink-0 font-medium tabular-nums">{row.open}</span>
					</div>
					<div class="bg-surface-inset flex h-2.5 overflow-hidden rounded-full">
						{#if row.overdue > 0}
							<div class="bg-danger h-full" style:width="{(row.overdue / maxOpen) * 100}%"></div>
						{/if}
						<div
							class="bg-chart-1 h-full"
							style:width="{((row.open - row.overdue) / maxOpen) * 100}%"
						></div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
