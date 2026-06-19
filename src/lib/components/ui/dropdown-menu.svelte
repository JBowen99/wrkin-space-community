<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Settings01Icon } from '@hugeicons/core-free-icons';
	import BrandText from '../brand/brand-text.svelte';
	import { menuTriggerActionClass, menuTriggerClass } from './menu-styles';

	type MenuTriggerVariant = 'default' | 'action' | 'unstyled';

	type Item = {
		label: string;
		href?: string;
		onclick?: () => void;
		active?: boolean;
		destructive?: boolean;
		disabled?: boolean;
		separatorBefore?: boolean;
		settingsHref?: string;
		settingsLabel?: string;
		plainLabel?: boolean;
	};

	type Props = {
		trigger: Snippet;
		items: Item[];
		align?: 'start' | 'center' | 'end';
		triggerVariant?: MenuTriggerVariant;
		triggerClass?: string;
	};

	let {
		trigger,
		items,
		align = 'start',
		triggerVariant = 'default',
		triggerClass = ''
	}: Props = $props();

	const triggerBaseClass = $derived(
		triggerVariant === 'action'
			? menuTriggerActionClass
			: triggerVariant === 'unstyled'
				? ''
				: menuTriggerClass
	);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={cn(triggerBaseClass, triggerClass)}>
		{@render trigger()}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			{align}
			class="border-border bg-surface-raised z-50 min-w-[10rem] rounded-lg border p-1 shadow-md"
			sideOffset={4}
		>
			{#each items as item (item.label + (item.href ?? ''))}
				{#if item.separatorBefore}
					<div class="border-border my-1 border-t" role="separator"></div>
				{/if}
				{#if item.disabled}
					<div class="text-ink-muted px-3 py-1.5 text-xs font-medium" role="presentation">
						{item.label}
					</div>
				{:else if item.href}
					<div class="group/menuitem relative">
						<DropdownMenu.Item>
							<a
								href={item.href}
								class={cn(
									'block w-full rounded-md py-2 pr-9 pl-3 text-left text-sm',
									item.active ? 'bg-accent-muted text-accent' : 'text-ink hover:bg-surface-hover'
								)}
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
								class="text-ink-muted hover:bg-surface-hover hover:text-ink focus-visible:ring-accent/40 absolute top-1/2 right-1.5 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md opacity-0 transition group-hover/menuitem:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
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
						class={cn(
							'w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm',
							item.active
								? 'bg-accent-muted text-accent'
								: item.destructive
									? 'text-danger hover:bg-danger-muted'
									: 'text-ink hover:bg-surface-hover'
						)}
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
