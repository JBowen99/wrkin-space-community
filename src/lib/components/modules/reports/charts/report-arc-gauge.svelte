<script lang="ts">
	import { ArcChart } from 'layerchart';
	import type { Snippet } from 'svelte';
	import ClientChart from './client-chart.svelte';
	import { REPORT_CHART_SEMANTIC } from './report-chart-colors';

	type Props = {
		percent: number;
		ariaLabel: string;
		heightClass?: string;
		fillColor?: string;
		center?: Snippet;
	};

	let {
		percent,
		ariaLabel,
		heightClass = 'h-full',
		fillColor = REPORT_CHART_SEMANTIC.done,
		center
	}: Props = $props();

	const data = [{ key: 'progress', label: 'Complete', value: Math.min(100, Math.max(0, percent)) }];
</script>

<ClientChart {heightClass}>
	<div class="relative h-full w-full" role="img" aria-label={ariaLabel}>
		<ArcChart
			{data}
			key="key"
			label="label"
			value="value"
			maxValue={100}
			innerRadius={0.72}
			outerRadius={0}
			padAngle={0}
			legend={false}
			padding={8}
			series={[
				{
					key: 'progress',
					value: 'value',
					color: fillColor,
					props: { trackFill: REPORT_CHART_SEMANTIC.track }
				}
			]}
		/>
		{#if center}
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center"
				aria-hidden="true"
			>
				{@render center()}
			</div>
		{/if}
	</div>
</ClientChart>
