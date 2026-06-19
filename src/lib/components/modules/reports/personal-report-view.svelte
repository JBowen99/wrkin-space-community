<script lang="ts">
	import type { PersonalReportData } from '$lib/server/reports';
	import { REPORT_DATE_PRESET_LABELS } from '$lib/shared/reports';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Alert02Icon, CheckmarkCircle02Icon, TaskDone01Icon } from '@hugeicons/core-free-icons';
	import ActivityFeed from '../../activity/activity-feed.svelte';
	import Card from '../../ui/card.svelte';
	import ReportAreaChart from './charts/report-area-chart.svelte';
	import ReportBarChart from './charts/report-bar-chart.svelte';
	import ReportChartCard from './charts/report-chart-card.svelte';
	import { chartHeightForRows } from './charts/report-chart-layout';
	import { REPORT_CHART_SEMANTIC } from './charts/report-chart-colors';
	import { nestedListRowClass } from '../../ui/ui-styles';

	type Props = {
		data: PersonalReportData;
		teamSlug: string;
		wrkspaceSlug: string;
	};

	let { data, teamSlug, wrkspaceSlug }: Props = $props();

	const presetLabel = $derived(REPORT_DATE_PRESET_LABELS[data.config.dateRange.preset]);
	const completionSeries = $derived(
		data.completedByDay.map((day) => ({
			day: day.dayLabel,
			count: day.count
		}))
	);
	const activitySeries = $derived(
		data.activityByDay.map((day) => ({
			day: day.dayKey.slice(5),
			count: day.count
		}))
	);
	const topCompleted = $derived(data.completedInRange.slice(0, 5));
	const completionChartStyle = $derived(
		chartHeightForRows(completionSeries.length, {
			baseRem: 12,
			rowHeightRem: 0.12,
			minRem: 16,
			maxRem: 22
		})
	);

	const serializedActivity = $derived(
		data.activity.map((e) => ({
			...e,
			createdAt: e.createdAt.toISOString()
		}))
	);
</script>

<section class="space-y-8">
	<div class="flex items-center gap-4">
		<div
			class="bg-accent-muted font-display text-accent flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
			aria-hidden="true"
		>
			{data.memberName.charAt(0).toUpperCase()}
		</div>
		<div>
			<h2 class="font-display text-ink text-xl font-semibold">{data.memberName}</h2>
			<p class="text-ink-muted text-sm">{presetLabel}</p>
		</div>
	</div>

	<ReportChartCard
		title="Completions per day"
		subtitle="Tasks marked done during the selected period"
		height="auto"
		chartStyle={completionChartStyle}
		empty={completionSeries.every((d) => d.count === 0)}
		emptyMessage="No completions in this range"
	>
		<ReportBarChart
			data={completionSeries}
			x="count"
			y="day"
			orientation="vertical"
			ariaLabel="Bar chart of task completions per day"
			series={[
				{
					key: 'completions',
					label: 'Completed',
					value: 'count',
					color: REPORT_CHART_SEMANTIC.done
				}
			]}
			bandPadding={0.45}
			paddingBottom={36}
		/>
	</ReportChartCard>

	<div class="grid gap-3 sm:grid-cols-3">
		<div
			class="border-border bg-surface-raised flex items-center gap-3 rounded-xl border px-4 py-3"
		>
			<HugeiconsIcon icon={CheckmarkCircle02Icon} class="text-success size-5" />
			<div>
				<p class="text-ink-muted text-xs font-medium">Completed</p>
				<p class="font-display text-ink text-2xl font-semibold">
					{data.completedInRange.length}
				</p>
			</div>
		</div>
		<div
			class="border-border bg-surface-raised flex items-center gap-3 rounded-xl border px-4 py-3"
		>
			<HugeiconsIcon icon={TaskDone01Icon} class="text-accent size-5" />
			<div>
				<p class="text-ink-muted text-xs font-medium">Open assigned</p>
				<p class="font-display text-ink text-2xl font-semibold">{data.openAssigned.length}</p>
			</div>
		</div>
		<div
			class="border-border bg-surface-raised flex items-center gap-3 rounded-xl border px-4 py-3"
		>
			<HugeiconsIcon icon={Alert02Icon} class="text-danger size-5" />
			<div>
				<p class="text-ink-muted text-xs font-medium">Overdue</p>
				<p class="font-display text-danger text-2xl font-semibold">
					{data.overdueAssigned.length}
				</p>
			</div>
		</div>
	</div>

	<ReportChartCard
		title="Activity sparkline"
		subtitle="Events across the wrkspace in this period"
		height="md"
		empty={activitySeries.every((d) => d.count === 0)}
		emptyMessage="No activity in this range"
	>
		<ReportAreaChart
			data={activitySeries}
			x="day"
			y="count"
			ariaLabel="Area chart of activity events per day"
			color="var(--color-chart-3)"
		/>
	</ReportChartCard>

	<div>
		<h2 class="font-display text-ink text-lg font-semibold">Top completed</h2>
		{#if topCompleted.length === 0}
			<p class="text-ink-muted mt-2 text-sm">No tasks completed in this range.</p>
		{:else}
			<ul class="divide-border/60 border-border mt-3 divide-y rounded-xl border">
				{#each topCompleted as task (task.id)}
					<li>
						<a href={task.href} class={nestedListRowClass}>
							<p class="text-ink font-medium">{task.title}</p>
							<p class="text-ink-muted mt-0.5 text-xs">{task.moduleTitle}</p>
						</a>
					</li>
				{/each}
			</ul>
			{#if data.completedInRange.length > 5}
				<p class="text-ink-muted mt-2 text-xs">
					+{data.completedInRange.length - 5} more completed in this period
				</p>
			{/if}
		{/if}
	</div>

	{#if data.overdueAssigned.length > 0}
		<div>
			<h2 class="font-display text-ink text-lg font-semibold">Overdue</h2>
			<ul class="divide-border/60 border-border mt-3 divide-y rounded-xl border">
				{#each data.overdueAssigned as task (task.id)}
					<li>
						<a href={task.href} class={nestedListRowClass}>
							<p class="text-ink font-medium">{task.title}</p>
							<p class="text-ink-muted mt-0.5 text-xs">{task.moduleTitle}</p>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div>
		<h2 class="font-display text-ink text-lg font-semibold">Recent activity</h2>
		<Card padding="compact" class="mt-3">
			<ActivityFeed
				events={serializedActivity}
				{teamSlug}
				{wrkspaceSlug}
				emptyMessage="No activity in this range."
			/>
		</Card>
	</div>
</section>
