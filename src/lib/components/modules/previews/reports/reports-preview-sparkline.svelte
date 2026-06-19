<script lang="ts">
	type Props = {
		values: number[];
		class?: string;
		emptyLabel?: string;
		heightClass?: string;
	};

	let {
		values,
		class: className = '',
		emptyLabel = 'No activity',
		heightClass = 'h-12'
	}: Props = $props();

	const max = $derived(Math.max(1, ...values));
	const hasData = $derived(values.some((value) => value > 0));
</script>

{#if !hasData}
	<p class="text-ink-muted text-[10px] {className}">{emptyLabel}</p>
{:else}
	<div class="flex {heightClass} items-end gap-0.5 {className}" role="img" aria-label="Activity trend">
		{#each values as value, index (index)}
			<div
				class="bg-accent/55 min-w-0 flex-1 rounded-sm"
				style:height="{Math.max(12, (value / max) * 100)}%"
				title={String(value)}
			></div>
		{/each}
	</div>
{/if}
