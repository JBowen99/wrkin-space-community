<script lang="ts">
	type Props = {
		size?: 'preview' | 'page';
	};

	let { size = 'page' }: Props = $props();

	const compact = $derived(size === 'preview');
</script>

<div
	class="flex w-full flex-col {compact ? 'justify-center gap-2' : 'gap-4'}"
	aria-hidden={compact}
>
	<div class="grid grid-cols-3 {compact ? 'gap-1.5' : 'gap-3'}">
		{#each Array.from({ length: 3 }) as _, index (index)}
			<div
				class="border-border/60 bg-surface/40 flex min-h-0 flex-col rounded-xl border border-dashed {compact
					? 'min-h-24 p-1.5'
					: 'min-h-52 p-3'}"
			>
				<div
					class="skeleton-hatch border-border/50 rounded border border-dashed {compact
						? 'h-2.5 w-16'
						: 'h-3 w-20'}"
				></div>
				<div class="mt-2 space-y-2">
					<div
						class="skeleton-hatch border-border/40 rounded border border-dashed {compact
							? 'h-8'
							: 'h-14'}"
					></div>
					{#if !compact && index === 0}
						<div class="skeleton-hatch border-border/40 h-14 rounded border border-dashed"></div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
