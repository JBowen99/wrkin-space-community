<script lang="ts">
	import ButtonUi from '../ui/button.svelte';
	import ModuleCardTitleSpacer from './module-card-title-spacer.svelte';

	type Props = {
		onclick: () => void;
	};

	let { onclick }: Props = $props();
</script>

<div class="module-grid-item grid w-full grid-rows-[auto_auto] gap-1.5 self-start">
	<ModuleCardTitleSpacer />
	<ButtonUi
		type="button"
		variant="unstyled"
		{onclick}
		class="border-border bg-accent-muted/20 text-ink-muted hover:border-accent/50 hover:bg-accent-muted/40 hover:text-accent flex aspect-square w-full shrink-0 flex-col items-center justify-center self-start rounded-xl border border-dashed p-6 transition"
	>
		<span class="text-3xl leading-none font-light">+</span>
		<span class="mt-2 text-sm font-medium">Add module</span>
	</ButtonUi>
</div>
