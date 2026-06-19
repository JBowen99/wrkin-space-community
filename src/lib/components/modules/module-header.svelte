<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Settings01Icon } from '@hugeicons/core-free-icons';
	import type { Snippet } from 'svelte';
	import ButtonUi from '../ui/button.svelte';
	import DropdownMenu from '../ui/dropdown-menu.svelte';
	import ModuleTitleEditor from './module-title-editor.svelte';
	import DeleteModuleDialog from './delete-module-dialog.svelte';

	type MenuItem = {
		label: string;
		href?: string;
		onclick?: () => void;
		active?: boolean;
		destructive?: boolean;
	};

	type Props = {
		backHref: string;
		backLabel: string;
		typeLabel: string;
		title: string;
		moduleId: string;
		titleFormAction?: string;
		titleAriaLabel?: string;
		extraMenuItems?: MenuItem[];
		titleTrailing?: Snippet;
		subtitle?: Snippet;
		class?: string;
	};

	let {
		backHref,
		backLabel,
		typeLabel,
		title,
		moduleId,
		titleFormAction,
		titleAriaLabel,
		extraMenuItems = [],
		titleTrailing,
		subtitle,
		class: className = ''
	}: Props = $props();

	let deleteOpen = $state(false);

	const menuItems = $derived([
		...extraMenuItems,
		{
			label: 'Delete module',
			destructive: true,
			onclick: () => {
				deleteOpen = true;
			}
		}
	]);
</script>

<header class={className}>
	<div class="mb-6 flex w-full items-center justify-between gap-1">
		<ButtonUi href={backHref} variant="ghost" class="-ml-2">← {backLabel}</ButtonUi>
		<DropdownMenu align="end" items={menuItems}>
			{#snippet trigger()}
				<span class="sr-only">Module settings</span>
				<HugeiconsIcon
					icon={Settings01Icon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			{/snippet}
		</DropdownMenu>
	</div>

	<p class="text-ink-muted text-xs font-medium tracking-wide uppercase">{typeLabel}</p>
	<div class="mt-1 flex items-start justify-between gap-4">
		<div class="min-w-0 flex-1">
			<ModuleTitleEditor {title} formAction={titleFormAction} ariaLabel={titleAriaLabel} />
			{#if subtitle}
				<div class="mt-1">
					{@render subtitle()}
				</div>
			{/if}
		</div>
		{#if titleTrailing}
			<div class="shrink-0 pt-1">
				{@render titleTrailing()}
			</div>
		{/if}
	</div>
</header>

<DeleteModuleDialog bind:open={deleteOpen} {moduleId} moduleTitle={title} />
