<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type TriggerProps = Record<string, unknown>;

	type Props = {
		text: string;
		trigger: Snippet<[TriggerProps]>;
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
		delayDuration?: number;
		disabled?: boolean;
	};

	let {
		text,
		trigger,
		side = 'top',
		align = 'center',
		sideOffset = 6,
		delayDuration,
		disabled = false
	}: Props = $props();
</script>

{#if disabled || !text}
	{@render trigger({})}
{:else}
	<Tooltip.Root {delayDuration}>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				{@render trigger(props)}
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				{side}
				{align}
				{sideOffset}
				class="bg-ink text-surface z-50 max-w-xs rounded-md px-2.5 py-1.5 text-xs font-medium shadow-md"
			>
				{text}
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
{/if}
