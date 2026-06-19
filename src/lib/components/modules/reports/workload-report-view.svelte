<script lang="ts">
	import type { WorkloadReportData } from '$lib/server/reports';
	import Collapsible from '../../ui/collapsible.svelte';
	import ReportBarChart from './charts/report-bar-chart.svelte';
	import ReportChartCard from './charts/report-chart-card.svelte';
	import { chartHeightForRows } from './charts/report-chart-layout';
	import { REPORT_CHART_SEMANTIC } from './charts/report-chart-colors';
	import ReportLegend from './charts/report-legend.svelte';
	import { buildWorkloadChartRows, workloadInsightLine } from './charts/workload-insight';
	import { tableHeadClass } from '../../ui/ui-styles';

	type Props = {
		data: WorkloadReportData;
	};

	let { data }: Props = $props();

	const chart = $derived(buildWorkloadChartRows(data.byAssignee));
	const insight = $derived(workloadInsightLine(data.byAssignee));
	const chartStyle = $derived(
		chartHeightForRows(chart.rows.length, { minRem: 18, maxRem: 34, rowHeightRem: 2.6 })
	);
	const legendItems = [
		{ label: 'Open', color: REPORT_CHART_SEMANTIC.open },
		{ label: 'Overdue', color: REPORT_CHART_SEMANTIC.overdue }
	];
</script>

<section class="space-y-6">
	<div class="flex flex-wrap gap-3 text-sm">
		<span class="bg-surface-muted text-ink rounded-full px-3 py-1">
			<span class="font-medium">{data.totals.open}</span> open
		</span>
		<span class="bg-danger-muted text-danger rounded-full px-3 py-1">
			<span class="font-medium">{data.totals.overdue}</span> overdue
		</span>
		<span class="bg-warning-muted text-warning rounded-full px-3 py-1">
			<span class="font-medium">{data.totals.dueThisWeek}</span> due within 7 days
		</span>
	</div>

	{#if data.byAssignee.length === 0}
		<p class="text-ink-muted text-sm">No open tasks in the linked modules.</p>
	{:else}
		<ReportChartCard
			title="Open work by assignee"
			subtitle="Multi-assignee tasks count toward each person."
			height="auto"
			chartStyle={chartStyle}
			empty={chart.rows.length === 0}
		>
			<ReportBarChart
				data={chart.rows}
				x="nonOverdue"
				y="name"
				orientation="horizontal"
				seriesLayout="stack"
				ariaLabel="Horizontal stacked bar chart of open tasks by assignee"
				series={[
					{
						key: 'nonOverdue',
						label: 'Open',
						value: 'nonOverdue',
						color: REPORT_CHART_SEMANTIC.open
					},
					{
						key: 'overdue',
						label: 'Overdue',
						value: 'overdue',
						color: REPORT_CHART_SEMANTIC.overdue
					}
				]}
				legend={false}
				bandPadding={0.35}
				horizontalLabelWidth={132}
			/>
			{#snippet caption()}
				<ReportLegend items={legendItems} />
				{#if chart.othersCount > 0}
					<p class="text-ink-muted mt-2 text-xs">+{chart.othersCount} others not shown</p>
				{/if}
			{/snippet}
		</ReportChartCard>

		{#if insight}
			<p class="border-border bg-surface-muted/40 text-ink rounded-xl border px-4 py-3 text-sm">
				{insight}
			</p>
		{/if}

		<Collapsible class="border-border bg-surface-raised rounded-xl border md:open:block">
			{#snippet trigger()}
				<span class="text-ink cursor-pointer list-none px-4 py-3 text-sm font-medium md:hidden">Show detail table</span>
			{/snippet}
			<div class="border-border overflow-x-auto border-t md:border-t-0">
				<table class="w-full min-w-[24rem] text-left text-sm">
					<thead class={tableHeadClass}>
						<tr>
							<th class="px-4 py-2">Assignee</th>
							<th class="px-4 py-2">Open</th>
							<th class="px-4 py-2">Overdue</th>
							<th class="px-4 py-2">Due soon</th>
						</tr>
					</thead>
					<tbody class="divide-border/60 divide-y">
						{#each data.byAssignee as row (row.userId ?? 'unassigned')}
							<tr>
								<td class="text-ink px-4 py-3 font-medium">{row.name}</td>
								<td class="text-ink-muted px-4 py-3">{row.open}</td>
								<td
									class="px-4 py-3 {row.overdue > 0 ? 'text-danger font-medium' : 'text-ink-muted'}"
								>
									{row.overdue}
								</td>
								<td
									class="px-4 py-3 {row.dueThisWeek > 0
										? 'text-warning font-medium'
										: 'text-ink-muted'}"
								>
									{row.dueThisWeek}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Collapsible>
	{/if}
</section>
