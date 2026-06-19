<script lang="ts">
	import type { ProgressReportData } from '$lib/server/reports';
	import Collapsible from '../../ui/collapsible.svelte';
	import {
		TASK_PRIORITY_LABELS,
		TASK_STATUS_LABELS,
		isTaskPriority,
		isTaskStatus
	} from '$lib/shared/tasks';
	import Badge from '../../ui/badge.svelte';
	import ReportBarChart from './charts/report-bar-chart.svelte';
	import ReportChartCard from './charts/report-chart-card.svelte';
	import ReportDonutChart from './charts/report-donut-chart.svelte';
	import ReportLegend from './charts/report-legend.svelte';
	import { chartHeightForRows } from './charts/report-chart-layout';
	import {
		REPORT_CHART_SEMANTIC,
		taskPriorityFill,
		taskStatusFill
	} from './charts/report-chart-colors';

	type ModuleLink = {
		moduleId: string;
		moduleTitle: string;
		href: string;
	};

	type Props = {
		data: ProgressReportData;
		moduleLinks: ModuleLink[];
	};

	let { data, moduleLinks }: Props = $props();

	const moduleHrefById = $derived(new Map(moduleLinks.map((m) => [m.moduleId, m.href])));

	const completionSlices = $derived([
		{
			key: 'done',
			label: 'Done',
			value: data.done,
			color: REPORT_CHART_SEMANTIC.done
		},
		{
			key: 'open',
			label: 'Open',
			value: data.open,
			color: REPORT_CHART_SEMANTIC.remainder
		}
	]);

	const moduleChartRows = $derived(
		data.byModule.map((row) => ({
			module: row.moduleTitle,
			percent: row.completionPercent,
			moduleId: row.moduleId
		}))
	);

	const statusSlices = $derived(
		data.byStatus.map((row) => ({
			key: row.status,
			label: isTaskStatus(row.status) ? TASK_STATUS_LABELS[row.status] : row.status,
			value: row.count,
			color: isTaskStatus(row.status) ? taskStatusFill(row.status) : REPORT_CHART_SEMANTIC.open
		}))
	);

	const priorityRows = $derived(
		data.byPriority.map((row) => ({
			priority: isTaskPriority(row.priority) ? TASK_PRIORITY_LABELS[row.priority] : row.priority,
			count: row.count,
			fill: isTaskPriority(row.priority)
				? taskPriorityFill(row.priority)
				: REPORT_CHART_SEMANTIC.open
		}))
	);

	const assigneeRows = $derived(
		data.byAssignee.map((row) => ({
			name: row.name,
			open: row.open,
			done: row.done
		}))
	);

	const completionLegendItems = $derived(
		completionSlices.map((slice) => ({ label: slice.label, value: slice.value, color: slice.color }))
	);
	const statusLegendItems = $derived(
		statusSlices.map((slice) => ({ label: slice.label, value: slice.value, color: slice.color }))
	);
	const assigneeLegendItems = [
		{ label: 'Open', color: REPORT_CHART_SEMANTIC.open },
		{ label: 'Done', color: REPORT_CHART_SEMANTIC.done }
	];
	const moduleChartStyle = $derived(
		chartHeightForRows(moduleChartRows.length, { minRem: 16, maxRem: 30, rowHeightRem: 2.2 })
	);
	const priorityChartStyle = $derived(
		chartHeightForRows(priorityRows.length, { minRem: 12, maxRem: 18, rowHeightRem: 2.3 })
	);
	const assigneeChartStyle = $derived(
		chartHeightForRows(assigneeRows.length, { minRem: 16, maxRem: 34, rowHeightRem: 2.8 })
	);
</script>

<section class="space-y-8">
	{#if data.total === 0}
		<p class="text-ink-muted text-sm">
			No tasks in the linked modules, or none match the current filters.
		</p>
	{:else}
		<div class="grid gap-4 md:grid-cols-2">
			<ReportChartCard title="Overall completion" height="lg" empty={data.total === 0}>
				<ReportDonutChart
					slices={completionSlices}
					ariaLabel="Donut chart of done versus open tasks"
					innerRadius={0.65}
					legend={false}
				>
					{#snippet center()}
						<div class="text-center">
							<p class="font-display text-ink text-3xl font-semibold">{data.completionPercent}%</p>
							<p class="text-ink-muted text-xs">complete</p>
						</div>
					{/snippet}
				</ReportDonutChart>
				{#snippet caption()}
					<ReportLegend items={completionLegendItems} />
				{/snippet}
			</ReportChartCard>

			<ReportChartCard
				title="By module"
				subtitle="Completion percentage per linked module"
				height="auto"
				chartStyle={moduleChartStyle}
				empty={moduleChartRows.length === 0}
				emptyMessage="No module breakdown"
			>
				<ReportBarChart
					data={moduleChartRows}
					x="percent"
					y="module"
					orientation="horizontal"
					ariaLabel="Horizontal bar chart of completion percentage by module"
					series={[
						{
							key: 'percent',
							label: 'Complete %',
							value: 'percent',
							color: REPORT_CHART_SEMANTIC.done
						}
					]}
					bandPadding={0.35}
					horizontalLabelWidth={128}
				/>
			</ReportChartCard>
		</div>

		{#if data.overdueCount > 0 || data.dueThisWeekCount > 0}
			<div class="flex flex-wrap gap-2">
				{#if data.overdueCount > 0}
					<Badge variant="danger">{data.overdueCount} overdue</Badge>
				{/if}
				{#if data.dueThisWeekCount > 0}
					<Badge variant="warning">{data.dueThisWeekCount} due within 7 days</Badge>
				{/if}
			</div>
		{/if}

		<div class="grid gap-4 md:grid-cols-2">
			{#if statusSlices.length > 0}
				<ReportChartCard title="By status" height="md">
					<ReportDonutChart
						slices={statusSlices}
						ariaLabel="Donut chart of tasks by status"
						innerRadius={0.55}
						legend={false}
					/>
					{#snippet caption()}
						<ReportLegend items={statusLegendItems} />
					{/snippet}
				</ReportChartCard>
			{/if}

			{#if priorityRows.length > 0}
				<ReportChartCard title="By priority" height="auto" chartStyle={priorityChartStyle}>
					<ReportBarChart
						data={priorityRows}
						x="count"
						y="priority"
						c="fill"
						orientation="horizontal"
						ariaLabel="Horizontal bar chart of tasks by priority"
						bandPadding={0.4}
						horizontalLabelWidth={112}
					/>
				</ReportChartCard>
			{/if}
		</div>

		{#if assigneeRows.length > 0}
		<Collapsible class="border-border bg-surface-raised rounded-xl border">
			{#snippet trigger()}
				<span class="font-display text-ink cursor-pointer px-4 py-3 text-sm font-semibold">By assignee ({assigneeRows.length})</span>
			{/snippet}
			<div class="border-border border-t p-4 pt-0">
				<ReportChartCard
					title="Open vs done"
					height="auto"
					chartStyle={assigneeChartStyle}
					class="border-0 bg-transparent p-0 shadow-none"
				>
					<ReportBarChart
						data={assigneeRows}
						x="open"
						y="name"
						orientation="horizontal"
						seriesLayout="group"
						ariaLabel="Grouped bar chart of open and done tasks by assignee"
						series={[
							{
								key: 'open',
								label: 'Open',
								value: 'open',
								color: REPORT_CHART_SEMANTIC.open
							},
							{
								key: 'done',
								label: 'Done',
								value: 'done',
								color: REPORT_CHART_SEMANTIC.done
							}
						]}
						legend={false}
						bandPadding={0.35}
						horizontalLabelWidth={128}
					/>
					{#snippet caption()}
						<ReportLegend items={assigneeLegendItems} />
					{/snippet}
				</ReportChartCard>
			</div>
		</Collapsible>
		{/if}

		{#if data.byModule.length > 0}
		<Collapsible class="border-border bg-surface-raised rounded-xl border">
			{#snippet trigger()}
				<span class="font-display text-ink cursor-pointer px-4 py-3 text-sm font-semibold">Module detail table</span>
			{/snippet}
			<div class="border-border overflow-x-auto border-t">
				<table class="w-full min-w-[20rem] text-left text-sm">
					<thead class="bg-surface-muted text-ink-muted text-xs font-medium">
						<tr>
							<th class="px-4 py-2">Module</th>
							<th class="px-4 py-2">Done</th>
							<th class="px-4 py-2">Open</th>
							<th class="px-4 py-2">Complete</th>
							<th class="px-4 py-2">Overdue</th>
						</tr>
					</thead>
					<tbody class="divide-border/60 divide-y">
						{#each data.byModule as row (row.moduleId)}
							<tr>
								<td class="text-ink px-4 py-2 font-medium">
									{#if moduleHrefById.has(row.moduleId)}
										<a
											href={moduleHrefById.get(row.moduleId)}
											class="text-accent hover:underline"
										>
											{row.moduleTitle}
										</a>
									{:else}
										{row.moduleTitle}
									{/if}
								</td>
								<td class="text-ink-muted px-4 py-2">{row.done}</td>
								<td class="text-ink-muted px-4 py-2">{row.open}</td>
								<td class="text-ink-muted px-4 py-2">{row.completionPercent}%</td>
								<td class="text-ink-muted px-4 py-2">{row.overdueCount}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Collapsible>
		{/if}
	{/if}
</section>
