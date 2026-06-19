<script lang="ts" generics="TData extends Record<string, unknown>">
	import { AreaChart } from 'layerchart';
	import ClientChart from './client-chart.svelte';
	import { REPORT_CHART_SEMANTIC } from './report-chart-colors';

	type Props = {
		data: TData[];
		x: keyof TData & string;
		y: keyof TData & string;
		ariaLabel: string;
		heightClass?: string;
		color?: string;
		grid?: boolean;
	};

	let {
		data,
		x,
		y,
		ariaLabel,
		heightClass = 'h-full',
		color = REPORT_CHART_SEMANTIC.open,
		grid = true
	}: Props = $props();
</script>

<ClientChart {heightClass}>
	<div class="h-full w-full" role="img" aria-label={ariaLabel}>
		<AreaChart
			{data}
			{x}
			{y}
			{grid}
			rule={false}
			padding={{ top: 12, right: 12, bottom: 28, left: 36 }}
			series={[
				{
					key: 'default',
					value: y,
					color,
					props: { fillOpacity: 0.2, strokeWidth: 2 }
				}
			]}
		/>
	</div>
</ClientChart>
