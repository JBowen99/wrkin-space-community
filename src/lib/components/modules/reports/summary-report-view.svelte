<script lang="ts">
	import type { SummaryReportData } from '$lib/server/reports';
	import Collapsible from '../../ui/collapsible.svelte';
	import { REPORT_DATE_PRESET_LABELS } from '$lib/shared/reports';
	import ActivityFeed from '../../activity/activity-feed.svelte';
	import Card from '../../ui/card.svelte';
	import ReportArcGauge from './charts/report-arc-gauge.svelte';
	import ReportAreaChart from './charts/report-area-chart.svelte';
	import ReportBarChart from './charts/report-bar-chart.svelte';
	import { chartHeightForRows } from './charts/report-chart-layout';
	import { groupActivityTimestampsByDay } from './charts/activity-by-day';
	import { REPORT_CHART_SEMANTIC } from './charts/report-chart-colors';
	import { nestedListRowClass } from '../../ui/ui-styles';

	type Props = {
		data: SummaryReportData;
		teamSlug: string;
		wrkspaceSlug: string;
	};

	let { data, teamSlug, wrkspaceSlug }: Props = $props();

	const presetLabel = $derived(REPORT_DATE_PRESET_LABELS[data.config.dateRange.preset]);

	const workloadRows = $derived(
		(data.workload?.topAssignees ?? []).slice(0, 3).map((row) => ({
			name: row.name,
			open: row.open
		}))
	);
	const workloadChartStyle = $derived(
		chartHeightForRows(workloadRows.length, { minRem: 10, maxRem: 14, rowHeightRem: 2.4 })
	);

	const activitySpark = $derived(data.activity ? groupActivityTimestampsByDay(data.activity) : []);

	const upcomingPreview = $derived({
		tasks: (data.upcoming?.tasks ?? []).slice(0, 2),
		events: (data.upcoming?.events ?? []).slice(0, 2),
		taskTotal: data.upcoming?.tasks.length ?? 0,
		eventTotal: data.upcoming?.events.length ?? 0
	});

	const upcomingItems = $derived(
		[
			...(data.upcoming?.tasks ?? []).map((task) => ({
				id: `task-${task.id}`,
				title: task.title,
				moduleTitle: task.moduleTitle,
				href: task.href,
				kind: 'Task',
				date: task.dueAt,
				dateLabel: task.dueAt.toLocaleDateString()
			})),
			...(data.upcoming?.events ?? []).map((event) => ({
				id: `event-${event.id}`,
				title: event.title,
				moduleTitle: event.moduleTitle,
				href: event.href,
				kind: 'Event',
				date: event.startsAt,
				dateLabel: event.startsAt.toLocaleString()
			}))
		]
			.sort((a, b) => a.date.getTime() - b.date.getTime())
			.slice(0, 4)
	);
</script>

<section class="space-y-8">
	<p class="text-ink-muted text-sm">Recent window: {presetLabel}</p>

	<div class="grid gap-4 lg:grid-cols-2">
		{#if data.progress}
			{@const progress = data.progress}
			<div class="border-border bg-surface-raised rounded-xl border p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-ink-muted text-xs font-medium">Progress</p>
						<p class="font-display text-ink mt-1 text-3xl font-semibold">
							{progress.completionPercent}%
						</p>
						<p class="text-ink-muted mt-1 text-xs">complete across linked task modules</p>
					</div>
					<div class="h-32 w-32 shrink-0">
						<ReportArcGauge
							percent={progress.completionPercent}
							ariaLabel="Completion gauge at {progress.completionPercent} percent"
						>
							{#snippet center()}
								<p class="font-display text-ink text-xl font-semibold">
									{progress.completionPercent}%
								</p>
							{/snippet}
						</ReportArcGauge>
					</div>
				</div>
				{#if progress.overdueCount > 0}
					<p class="text-danger mt-3 text-sm font-medium">{progress.overdueCount} overdue</p>
				{/if}
			</div>
		{/if}

		{#if data.workload}
			<div class="border-border bg-surface-raised rounded-xl border p-4">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p class="text-ink-muted text-xs font-medium">Workload</p>
						<p class="font-display text-ink mt-1 text-3xl font-semibold">
							{data.workload.totals.open}
						</p>
						<p class="text-ink-muted mt-1 text-xs">open tasks</p>
					</div>
					{#if data.workload.totals.overdue > 0}
						<p class="bg-danger-muted text-danger rounded-full px-3 py-1 text-xs font-medium">
							{data.workload.totals.overdue} overdue
						</p>
					{/if}
				</div>
				<div class="mt-4" style={workloadChartStyle}>
					{#if workloadRows.length > 0}
						<ReportBarChart
							data={workloadRows}
							x="open"
							y="name"
							orientation="horizontal"
							ariaLabel="Mini bar chart of top assignees by open tasks"
							series={[
								{
									key: 'open',
									label: 'Open',
									value: 'open',
									color: REPORT_CHART_SEMANTIC.open
								}
							]}
							grid={false}
							bandPadding={0.4}
							horizontalLabelWidth={112}
							paddingBottom={18}
						/>
					{:else}
						<p class="text-ink-muted flex h-full items-center text-xs">No open tasks</p>
					{/if}
				</div>
			</div>
		{/if}

		{#if data.upcoming}
			<div class="border-border bg-surface-raised rounded-xl border p-4">
				<p class="text-ink-muted text-xs font-medium">Upcoming (7 days)</p>
				<div class="mt-1 flex items-end gap-2">
					<p class="font-display text-ink text-3xl font-semibold">
						{upcomingPreview.taskTotal + upcomingPreview.eventTotal}
					</p>
					<p class="text-ink-muted pb-1 text-xs">
						{upcomingPreview.taskTotal} tasks · {upcomingPreview.eventTotal} events
					</p>
				</div>
				<ul class="mt-4 space-y-2">
					{#each upcomingItems as item (item.id)}
						<li>
							<a href={item.href} class="block rounded-lg hover:bg-surface-muted/60">
								<p class="text-ink truncate text-sm font-medium">{item.title}</p>
								<p class="text-ink-muted mt-0.5 text-xs">
									{item.kind} · {item.moduleTitle} · {item.dateLabel}
								</p>
							</a>
						</li>
					{/each}
					{#if upcomingPreview.taskTotal + upcomingPreview.eventTotal === 0}
						<li class="text-ink-muted text-sm">Nothing scheduled</li>
					{/if}
				</ul>
			</div>
		{/if}

		{#if data.activity}
			<div class="border-border bg-surface-raised rounded-xl border p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-ink-muted text-xs font-medium">Activity</p>
						<p class="font-display text-ink mt-1 text-3xl font-semibold">{data.activity.length}</p>
						<p class="text-ink-muted mt-1 text-xs">events in the selected window</p>
					</div>
				</div>
				<div class="mt-4 h-36">
					{#if activitySpark.length > 0}
						<ReportAreaChart
							data={activitySpark}
							x="day"
							y="count"
							ariaLabel="Activity sparkline"
							color="var(--color-chart-4)"
							grid={false}
						/>
					{:else}
						<p class="text-ink-muted flex h-full items-center text-xs">No recent events</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if data.progress && data.config.sections.includes('progress')}
		<Collapsible class="border-border bg-surface-raised rounded-xl border">
			{#snippet trigger()}
				<span class="text-ink cursor-pointer px-4 py-3 text-sm font-semibold">Progress detail</span>
			{/snippet}
			<div class="border-border text-ink-muted border-t px-4 py-3 text-sm">
				{data.progress.completionPercent}% complete · {data.progress.overdueCount} overdue
			</div>
		</Collapsible>
	{/if}

	{#if data.workload && data.config.sections.includes('workload')}
		<Collapsible class="border-border bg-surface-raised rounded-xl border">
			{#snippet trigger()}
				<span class="text-ink cursor-pointer px-4 py-3 text-sm font-semibold">Workload detail</span>
			{/snippet}
			<ul class="divide-border/60 border-border divide-y border-t">
				{#each data.workload.topAssignees as row (row.userId ?? row.name)}
					<li class="flex items-center justify-between px-4 py-3 text-sm">
						<span class="text-ink font-medium">{row.name}</span>
						<span class="text-ink-muted">{row.open} open</span>
					</li>
				{/each}
			</ul>
		</Collapsible>
	{/if}

	{#if data.upcoming && data.config.sections.includes('upcoming')}
		<Collapsible class="border-border bg-surface-raised rounded-xl border">
			{#snippet trigger()}
				<span class="text-ink cursor-pointer px-4 py-3 text-sm font-semibold">Upcoming detail</span>
			{/snippet}
			<div class="border-border space-y-4 border-t p-4">
				{#if data.upcoming.tasks.length > 0}
					<ul class="divide-border/60 border-border divide-y rounded-lg border">
						{#each data.upcoming.tasks as task (task.id)}
							<li>
								<a href={task.href} class={nestedListRowClass}>
									<p class="text-ink font-medium">{task.title}</p>
									<p class="text-ink-muted mt-0.5 text-xs">
										{task.moduleTitle} · {task.dueAt.toLocaleDateString()}
									</p>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
				{#if data.upcoming.events.length > 0}
					<ul class="divide-border/60 border-border divide-y rounded-lg border">
						{#each data.upcoming.events as event (event.id)}
							<li>
								<a href={event.href} class={nestedListRowClass}>
									<p class="text-ink font-medium">{event.title}</p>
									<p class="text-ink-muted mt-0.5 text-xs">
										{event.moduleTitle} · {event.startsAt.toLocaleString()}
									</p>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</Collapsible>
	{/if}

	{#if data.activity && data.config.sections.includes('activity')}
		<Collapsible class="border-border bg-surface-raised rounded-xl border">
			{#snippet trigger()}
				<span class="text-ink cursor-pointer px-4 py-3 text-sm font-semibold">Activity feed</span>
			{/snippet}
			<Card padding="compact" class="border-border rounded-none border-0 border-t shadow-none">
				<ActivityFeed
					events={data.activity.map((e) => ({
						...e,
						createdAt: e.createdAt.toISOString()
					}))}
					{teamSlug}
					{wrkspaceSlug}
					emptyMessage="No recent activity."
				/>
			</Card>
		</Collapsible>
	{/if}
</section>
