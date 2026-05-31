<script lang="ts">
	import { Popover } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		trigger: Snippet;
		content: Snippet;
		side?: 'top' | 'right' | 'bottom' | 'left';
		openOnHover?: boolean;
		open?: boolean;
	};

	let {
		trigger,
		content,
		side = 'top',
		openOnHover = true,
		open = $bindable(false)
	}: Props = $props();
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function handleEnter() {
		if (!openOnHover) return;
		if (closeTimer) clearTimeout(closeTimer);
		open = true;
	}

	function handleLeave() {
		if (!openOnHover) return;
		closeTimer = setTimeout(() => {
			open = false;
		}, 120);
	}
</script>

<Popover.Root bind:open>
	<div class="inline" onpointerenter={handleEnter} onpointerleave={handleLeave} role="presentation">
		<Popover.Trigger class="inline">
			{@render trigger()}
		</Popover.Trigger>
	</div>
	<Popover.Portal>
		<div onpointerenter={handleEnter} onpointerleave={handleLeave} role="presentation">
			<Popover.Content
				{side}
				class="z-50 rounded-lg border border-border bg-surface-raised p-2 shadow-md"
				sideOffset={6}
			>
				{@render content()}
			</Popover.Content>
		</div>
	</Popover.Portal>
</Popover.Root>
