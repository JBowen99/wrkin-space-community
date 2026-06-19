<script lang="ts">
	import Tooltip from './tooltip.svelte';

	type Props = {
		text: string;
		ariaLabel?: string;
		side?: 'top' | 'right' | 'bottom' | 'left';
	};

	let { text, ariaLabel = 'More information', side = 'top' }: Props = $props();
</script>

<Tooltip {text} {side}>
	{#snippet trigger(props)}
		<button
			{...props}
			type="button"
			class="text-ink-muted hover:bg-surface-hover hover:text-ink inline-flex size-4 shrink-0 items-center justify-center rounded-full transition"
			aria-label={ariaLabel}
		>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
				<path
					d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM7.25 7h1.5v4.5h-1.5V7zm0-2.25h1.5V6h-1.5V4.75z"
				/>
			</svg>
		</button>
	{/snippet}
</Tooltip>
