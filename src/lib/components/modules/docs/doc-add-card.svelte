<script lang="ts">
	import ButtonUi from '../../ui/button.svelte';
</script>

<div class="flex flex-col gap-1.5">
	<ButtonUi
		type="submit"
		variant="unstyled"
		class="border-border bg-accent-muted/10 text-ink-muted hover:border-accent/50 hover:bg-accent-muted/30 hover:text-accent flex aspect-[3/4] flex-col items-center justify-center rounded-xl border border-dashed p-4 transition"
	>
		<span class="text-3xl leading-none font-light">+</span>
		<span class="mt-2 text-center text-sm font-medium">New document</span>
	</ButtonUi>
	<span class="text-ink-muted invisible px-0.5 text-right text-[11px]" aria-hidden="true"
		>&#8203;</span
	>
</div>
