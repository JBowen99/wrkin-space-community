<script lang="ts">
	export type ReportLegendItem = {
		label: string;
		color: string;
		value?: string | number;
	};

	type Props = {
		items: ReportLegendItem[];
		ariaLabel?: string;
		class?: string;
	};

	let { items, ariaLabel = 'Chart legend', class: className = '' }: Props = $props();
</script>

{#if items.length > 0}
	<ul class="flex flex-wrap gap-x-3 gap-y-2 text-xs {className}" aria-label={ariaLabel}>
		{#each items as item (item.label)}
			<li class="text-ink-muted flex min-w-0 items-center gap-1.5">
				<span
					class="border-surface-raised size-2.5 shrink-0 rounded-full border"
					style:background={item.color}
					aria-hidden="true"
				></span>
				<span class="truncate">{item.label}</span>
				{#if item.value !== undefined}
					<span class="text-ink font-medium">{item.value}</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
