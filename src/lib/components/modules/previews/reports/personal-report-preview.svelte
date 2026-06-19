<script lang="ts">
	import type { ReportsModulePreviewPersonal } from '$lib/shared/reports-preview';
	import ReportsPreviewBadge from './reports-preview-badge.svelte';
	import ReportsPreviewSparkline from './reports-preview-sparkline.svelte';

	type Props = {
		preview: ReportsModulePreviewPersonal;
	};

	let { preview }: Props = $props();

	const initial = $derived(preview.memberName.charAt(0).toUpperCase() || '?');
</script>

<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
	<ReportsPreviewBadge reportType={preview.reportType} />

	<div class="mb-2 flex min-w-0 items-center gap-2.5">
		<div
			class="bg-accent-muted text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
			aria-hidden="true"
		>
			{initial}
		</div>
		<div class="min-w-0 flex-1">
			<p class="text-ink truncate text-xs font-medium">{preview.memberName}</p>
			<p class="text-ink-muted truncate text-[10px]">Personal output</p>
		</div>
		<div class="text-right">
			<p class="font-display text-ink text-xl font-semibold tabular-nums">
				{preview.completedCount}
			</p>
			<p class="text-ink-muted text-[10px]">done</p>
		</div>
	</div>

	<ReportsPreviewSparkline
		values={preview.completionSparkline}
		emptyLabel="No completions in range"
		heightClass="h-11"
		class="mb-2"
	/>

	<div class="mb-2 flex flex-wrap gap-1 text-[10px]">
		<span class="bg-surface-muted text-ink rounded-full px-2 py-0.5">
			{preview.openCount} open
		</span>
		{#if preview.overdueCount > 0}
			<span class="bg-danger-muted text-danger rounded-full px-2 py-0.5 font-medium">
				{preview.overdueCount} overdue
			</span>
		{/if}
	</div>

	{#if preview.recentTasks.length > 0}
		<ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
			{#each preview.recentTasks as task, index (index)}
				<li class="text-ink-muted truncate text-[10px]">✓ {task.title}</li>
			{/each}
		</ul>
	{/if}
</div>
