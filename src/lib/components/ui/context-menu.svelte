<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Item = {
		label: string;
		onclick: () => void;
		destructive?: boolean;
	};

	type Props = {
		children: Snippet;
		items: Item[];
	};

	let { children, items }: Props = $props();
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger class="block h-full w-full">
		{@render children()}
	</ContextMenu.Trigger>
	<ContextMenu.Portal>
		<ContextMenu.Content
			class="z-50 min-w-[10rem] rounded-lg border border-border bg-surface-raised p-1 shadow-md"
		>
			{#each items as item (item.label)}
				<ContextMenu.Item
					class="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm {item.destructive
						? 'text-red-700 hover:bg-red-50'
						: 'text-ink hover:bg-stone-50'}"
					onclick={item.onclick}
				>
					{item.label}
				</ContextMenu.Item>
			{/each}
		</ContextMenu.Content>
	</ContextMenu.Portal>
</ContextMenu.Root>
