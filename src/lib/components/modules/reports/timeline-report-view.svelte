<script lang="ts">
	import type { TimelineReportData } from '$lib/server/reports';
	import type { GanttTimeScale } from '$lib/shared/tasks-gantt';
	import TabsUi from '../../ui/tabs.svelte';
	import { REPORT_CHART_SEMANTIC } from './charts/report-chart-colors';
	import ReportLegend from './charts/report-legend.svelte';
	import ReportsTimelineChart from './reports-timeline-chart.svelte';

	type Props = {
		data: TimelineReportData;
	};

	let { data }: Props = $props();

	let timeScale = $state<GanttTimeScale>(data.config.timeScale);

	$effect(() => {
		timeScale = data.config.timeScale;
	});

	const taskCount = $derived(
		data.gantt.tasks.filter((t) => t.classes?.includes('report-timeline-task-bar')).length
	);
	const eventCount = $derived(
		data.gantt.tasks.filter((t) => t.classes?.includes('report-timeline-event-bar')).length
	);

	const rangeLabel = $derived.by(() => {
		if (data.gantt.tasks.length === 0) return 'No span';
		const from = new Date(data.gantt.from);
		const to = new Date(data.gantt.to);
		const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
		return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`;
	});

	const upcomingInsight = $derived.by(() => {
		const horizon = Date.now() + 14 * 24 * 60 * 60 * 1000;
		const count = data.gantt.tasks.filter((t) => t.from <= horizon).length;
		if (count === 0) return null;
		return `${count} item${count === 1 ? '' : 's'} start within the next 14 days`;
	});

	const legendItems = [
		{ label: 'Tasks', color: REPORT_CHART_SEMANTIC.open },
		{ label: 'Events', color: 'var(--color-chart-4)' }
	];
</script>

<section class="space-y-4">
	<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
		<div class="flex flex-wrap gap-2">
			<span class="bg-surface-muted text-ink rounded-full px-3 py-1 text-xs font-medium">
				{taskCount} task{taskCount === 1 ? '' : 's'}
			</span>
			<span class="bg-surface-muted text-ink rounded-full px-3 py-1 text-xs font-medium">
				{eventCount} event{eventCount === 1 ? '' : 's'}
			</span>
			<span class="bg-surface-muted text-ink-muted rounded-full px-3 py-1 text-xs font-medium">
				{rangeLabel}
			</span>
		</div>

		<div class="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
			{#if upcomingInsight}
				<p class="text-ink-muted basis-full text-xs sm:basis-auto">{upcomingInsight}</p>
			{/if}
			<ReportLegend items={legendItems} class="basis-full sm:basis-auto" />
			<div
				class="border-border bg-surface-raised flex items-center gap-2 rounded-lg border px-2 py-1"
			>
				<span class="text-ink-muted text-xs font-medium">Scale</span>
				<TabsUi
					tabs={[
						{ value: 'week', label: 'Week' },
						{ value: 'day', label: 'Day' }
					]}
					value={timeScale}
					onValueChange={(v) => {
						if (v === 'week' || v === 'day') timeScale = v;
					}}
					listClass="h-7"
					triggerClass="px-2.5 text-xs"
					ariaLabel="Timeline scale"
				/>
			</div>
		</div>
	</div>

	<ReportsTimelineChart gantt={data.gantt} itemHrefs={data.itemHrefs} {timeScale} />
</section>
