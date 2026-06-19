<script lang="ts" generics="TData extends Record<string, unknown>">
	import { BarChart } from 'layerchart';
	import type { SeriesData } from 'layerchart';
	import type { Component } from 'svelte';
	import type { BarsProps } from 'layerchart';
	import ClientChart from './client-chart.svelte';

	type Orientation = 'horizontal' | 'vertical';
	type SeriesLayout = 'overlap' | 'stack' | 'stackExpand' | 'stackDiverging' | 'group';

	type Props = {
		data: TData[];
		x: keyof TData & string;
		y: keyof TData & string;
		c?: keyof TData & string;
		orientation?: Orientation;
		seriesLayout?: SeriesLayout;
		series?: SeriesData<TData, Component<BarsProps>>[];
		ariaLabel: string;
		heightClass?: string;
		legend?: boolean;
		grid?: boolean;
		bandPadding?: number;
		horizontalLabelWidth?: number;
		paddingBottom?: number;
	};

	let {
		data,
		x,
		y,
		c,
		orientation = 'vertical',
		seriesLayout = 'overlap',
		series,
		ariaLabel,
		heightClass = 'h-full',
		legend = false,
		grid = true,
		bandPadding,
		horizontalLabelWidth = 96,
		paddingBottom = 28
	}: Props = $props();
</script>

<ClientChart {heightClass}>
	<div class="h-full w-full" role="img" aria-label={ariaLabel}>
		<BarChart
			{data}
			{x}
			{y}
			{c}
			{orientation}
			{seriesLayout}
			{series}
			{legend}
			{grid}
			{bandPadding}
			rule={false}
			padding={{
				top: 8,
				right: 12,
				bottom: paddingBottom,
				left: orientation === 'horizontal' ? horizontalLabelWidth : 36
			}}
			props={{
				bars: { stroke: 'var(--color-surface-raised)', strokeWidth: 1 }
			}}
		/>
	</div>
</ClientChart>
