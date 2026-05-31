<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Settings01Icon } from '@hugeicons/core-free-icons';
	import BrandText from '../brand/brand-text.svelte';

	type Item = {
		label: string;
		href?: string;
		onclick?: () => void;
		active?: boolean;
		destructive?: boolean;
		settingsHref?: string;
		settingsLabel?: string;
		plainLabel?: boolean;
	};

	type Props = {
		trigger: Snippet;
		items: Item[];
		align?: 'start' | 'center' | 'end';
		triggerClass?: string;
	};

	let { trigger, items, align = 'start', triggerClass = '' }: Props = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-ink-muted transition hover:bg-stone-100 hover:text-ink {triggerClass}"
	>
		{@render trigger()}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			{align}
			class="z-50 min-w-[10rem] rounded-lg border border-border bg-surface-raised p-1 shadow-md"
			sideOffset={4}
		>
			{#each items as item (item.label + (item.href ?? ''))}
				{#if item.href}
					<div class="group/menuitem relative">
						<DropdownMenu.Item>
							<a
								href={item.href}
								class="block w-full rounded-md py-2 pr-9 pl-3 text-left text-sm {item.active
									? 'bg-accent-muted text-accent'
									: 'text-ink hover:bg-stone-50'}"
							>
								{#if item.plainLabel}
									{item.label}
								{:else}
									<BrandText text={item.label} />
								{/if}
							</a>
						</DropdownMenu.Item>
						{#if item.settingsHref}
							<a
								href={item.settingsHref}
								class="absolute top-1/2 right-1.5 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted opacity-0 transition group-hover/menuitem:opacity-100 hover:bg-stone-100 hover:text-ink focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
								aria-label={item.settingsLabel ?? `${item.label} settings`}
								title={item.settingsLabel ?? `${item.label} settings`}
							>
								<HugeiconsIcon
									icon={Settings01Icon}
									size={16}
									color="currentColor"
									strokeWidth={2}
									aria-hidden={true}
								/>
							</a>
						{/if}
					</div>
				{:else}
					<DropdownMenu.Item
						class="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm {item.active
							? 'bg-accent-muted text-accent'
							: item.destructive
								? 'text-red-700 hover:bg-red-50'
								: 'text-ink hover:bg-stone-50'}"
						onclick={item.onclick}
					>
						{#if item.plainLabel}
							{item.label}
						{:else}
							<BrandText text={item.label} />
						{/if}
					</DropdownMenu.Item>
				{/if}
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
