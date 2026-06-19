<script lang="ts">
	import type { ReportsModulePreviewActivityDigest } from '$lib/shared/reports-preview';
	import ReportsPreviewBadge from './reports-preview-badge.svelte';
	import ReportsPreviewSparkline from './reports-preview-sparkline.svelte';

	type Props = {
		preview: ReportsModulePreviewActivityDigest;
	};

	let { preview }: Props = $props();
</script>

<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
	<ReportsPreviewBadge reportType={preview.reportType} />

	<div class="mb-2 flex items-end justify-between gap-3">
		<div>
			<p class="font-display text-ink text-2xl font-semibold tabular-nums">{preview.metric ?? 0}</p>
			<p class="text-ink-muted text-xs">events</p>
		</div>
		<p class="text-ink-muted max-w-[7rem] text-right text-[10px] leading-snug">{preview.headline}</p>
	</div>

	<ReportsPreviewSparkline
		values={preview.dayCounts}
		emptyLabel="No activity in range"
		heightClass="h-12"
		class="mb-2"
	/>

	{#if preview.topTypes.length > 0}
		<ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
			{#each preview.topTypes as row (row.label)}
				<li class="flex items-center justify-between gap-2 text-[10px]">
					<span class="text-ink-muted truncate">{row.label}</span>
					<span class="text-ink shrink-0 font-medium tabular-nums">{row.count}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-ink-muted text-[10px]">Activity will appear once events occur.</p>
	{/if}
</div>
