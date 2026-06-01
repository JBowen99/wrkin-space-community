<script lang="ts">
	import ModuleCardTitleSpacer from './module-card-title-spacer.svelte';

	type Props = {
		onclick: () => void;
	};

	let { onclick }: Props = $props();
</script>

<div class="module-grid-item grid w-full grid-rows-[auto_auto] gap-1.5 self-start">
	<ModuleCardTitleSpacer />
	<button
		type="button"
		{onclick}
		class="flex aspect-square w-full shrink-0 flex-col items-center justify-center self-start rounded-xl border border-dashed border-border bg-accent-muted/20 p-6 text-ink-muted transition hover:border-accent/50 hover:bg-accent-muted/40 hover:text-accent"
	>
		<span class="text-3xl leading-none font-light">+</span>
		<span class="mt-2 text-sm font-medium">Add module</span>
	</button>
</div>
