<script lang="ts">
	import type { ActivityDigestReportData } from '$lib/server/reports';
	import { REPORT_DATE_PRESET_LABELS } from '$lib/shared/reports';
	import ActivityFeed from '../../activity/activity-feed.svelte';
	import Card from '../../ui/card.svelte';
	import Button from '../../ui/button.svelte';
	import ReportAreaChart from './charts/report-area-chart.svelte';
	import ReportBarChart from './charts/report-bar-chart.svelte';
	import ReportChartCard from './charts/report-chart-card.svelte';
	import { chartHeightForRows } from './charts/report-chart-layout';
	import { chartColorAt } from './charts/report-chart-colors';

	type Props = {
		data: ActivityDigestReportData;
		teamSlug: string;
		wrkspaceSlug: string;
		moduleTypeLabel?: string | null;
	};

	let { data, teamSlug, wrkspaceSlug, moduleTypeLabel = null }: Props = $props();

	const presetLabel = $derived(REPORT_DATE_PRESET_LABELS[data.config.dateRange.preset]);

	const daySeries = $derived(
		[...data.byDay].reverse().map((group) => ({
			day: group.dayLabel.replace(/, \d{4}$/, ''),
			count: group.events.length
		}))
	);

	const typeRows = $derived(
		Object.entries(data.countsByType)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 8)
			.map(([type, count], index) => ({
				type: type.replace(/\./g, ' '),
				count,
				color: chartColorAt(index)
			}))
	);
	const typeChartStyle = $derived(
		chartHeightForRows(typeRows.length, { minRem: 14, maxRem: 26, rowHeightRem: 2.35 })
	);

	const visibleDays = $derived(data.byDay.slice(0, 3));
	const hiddenDayCount = $derived(Math.max(0, data.byDay.length - 3));
	let showAllDays = $state(false);
</script>

<section class="space-y-8">
	<p class="text-ink-muted text-sm">
		{presetLabel}
		{#if moduleTypeLabel}
			· {moduleTypeLabel} only
		{/if}
		· {data.eventCount} event{data.eventCount === 1 ? '' : 's'}
	</p>

	{#if data.byDay.length === 0}
		<p class="text-ink-muted text-sm">No activity in this range.</p>
	{:else}
		<div class="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
			<ReportChartCard title="Events per day" subtitle="Activity volume across the selected range" height="lg">
				<ReportAreaChart
					data={daySeries}
					x="day"
					y="count"
					ariaLabel="Area chart of activity events per day"
				/>
			</ReportChartCard>

			<ReportChartCard
				title="Top event types"
				height="auto"
				chartStyle={typeChartStyle}
				empty={typeRows.length === 0}
				emptyMessage="No typed events"
			>
				<ReportBarChart
					data={typeRows}
					x="count"
					y="type"
					c="color"
					orientation="horizontal"
					ariaLabel="Horizontal bar chart of top activity event types"
					bandPadding={0.35}
					horizontalLabelWidth={144}
				/>
			</ReportChartCard>
		</div>

		<div class="space-y-6">
			{#each showAllDays ? data.byDay : visibleDays as group (group.dayKey)}
				<div>
					<h2 class="font-display text-ink text-lg font-semibold">{group.dayLabel}</h2>
					<Card padding="compact" class="mt-2">
						<ActivityFeed
							events={group.events.map((e) => ({
								...e,
								createdAt: e.createdAt.toISOString()
							}))}
							{teamSlug}
							{wrkspaceSlug}
							emptyMessage=""
						/>
					</Card>
				</div>
			{/each}

			{#if hiddenDayCount > 0 && !showAllDays}
				<Button variant="ghost" type="button" onclick={() => (showAllDays = true)}>
					Show {hiddenDayCount} more day{hiddenDayCount === 1 ? '' : 's'}
				</Button>
			{/if}
		</div>
	{/if}
</section>
