<script lang="ts">
	import type { ReportsModulePreviewTimeline } from '$lib/shared/reports-preview';
	import ReportsPreviewBadge from './reports-preview-badge.svelte';

	type Props = {
		preview: ReportsModulePreviewTimeline;
	};

	let { preview }: Props = $props();
</script>

<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
	<ReportsPreviewBadge reportType={preview.reportType} />

	<div class="mb-2 flex items-end justify-between gap-3">
		<div>
			<p class="font-display text-ink text-2xl font-semibold tabular-nums">
				{preview.taskCount + preview.eventCount}
			</p>
			<p class="text-ink-muted text-xs">scheduled items</p>
		</div>
		<div class="flex flex-col items-end gap-1 text-[10px]">
			{#if preview.taskCount > 0}
				<span class="bg-surface-muted text-ink rounded-full px-2 py-0.5">
					{preview.taskCount} task{preview.taskCount === 1 ? '' : 's'}
				</span>
			{/if}
			{#if preview.eventCount > 0}
				<span class="bg-warning-muted text-warning rounded-full px-2 py-0.5">
					{preview.eventCount} event{preview.eventCount === 1 ? '' : 's'}
				</span>
			{/if}
		</div>
	</div>

	{#if !preview.hasSources}
		<p class="text-ink-muted text-xs">Link task or calendar modules.</p>
	{:else if preview.bars.length === 0}
		<p class="text-ink-muted text-xs">Nothing scheduled yet.</p>
	{:else}
		<div
			class="border-border/60 bg-surface/40 relative min-h-0 flex-1 rounded-xl border border-dashed p-2"
		>
			<div class="bg-border/50 absolute inset-x-2 top-1/2 h-px -translate-y-1/2"></div>
			<ul class="relative flex h-full flex-col justify-center gap-1.5">
				{#each preview.bars as bar, index (index)}
					<li class="relative h-3">
						<div
							class="absolute top-0 h-full rounded-sm {bar.kind === 'event'
								? 'bg-warning/70'
								: 'bg-chart-2/80'}"
							style:left="{bar.startPct}%"
							style:width="{bar.widthPct}%"
						></div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
