<script lang="ts">
	import { PieChart } from 'layerchart';
	import type { Snippet } from 'svelte';
	import ClientChart from './client-chart.svelte';

	type Slice = {
		key: string;
		label: string;
		value: number;
		color: string;
	};

	type Props = {
		slices: Slice[];
		ariaLabel: string;
		heightClass?: string;
		innerRadius?: number;
		legend?: boolean;
		center?: Snippet;
	};

	let {
		slices,
		ariaLabel,
		heightClass = 'h-full',
		innerRadius = 0.62,
		legend = false,
		center
	}: Props = $props();

	const data = $derived(
		slices.map((s) => ({
			key: s.key,
			label: s.label,
			value: s.value,
			color: s.color
		}))
	);
</script>

<ClientChart {heightClass}>
	<div class="relative h-full w-full" role="img" aria-label={ariaLabel}>
		<PieChart
			{data}
			key="key"
			label="label"
			value="value"
			c="color"
			{innerRadius}
			{legend}
			padAngle={0.02}
			padding={{ top: 8, right: 8, bottom: 8, left: 8 }}
			props={{
				arc: { stroke: 'var(--color-surface-raised)', strokeWidth: 2 }
			}}
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
