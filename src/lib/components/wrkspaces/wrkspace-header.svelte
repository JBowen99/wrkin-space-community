<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Settings01Icon } from '@hugeicons/core-free-icons';
	import BrandText from '../brand/brand-text.svelte';
	import DropdownMenu from '../ui/dropdown-menu.svelte';
	import DeleteWrkspaceDialog from '../wrkspaces/delete-wrkspace-dialog.svelte';

	type MenuItem = {
		label: string;
		href?: string;
		onclick?: () => void;
		active?: boolean;
		destructive?: boolean;
	};

	type Props = {
		name: string;
		description: string;
		settingsHref?: string;
		canDelete?: boolean;
		/** Extra cog menu entries shown before Delete wrkspace. */
		extraMenuItems?: MenuItem[];
	};

	let { name, description, settingsHref, canDelete = true, extraMenuItems = [] }: Props = $props();

	let deleteOpen = $state(false);

	const menuItems = $derived([
		...extraMenuItems,
		...(settingsHref ? [{ label: 'Settings', href: settingsHref }] : []),
		...(canDelete
			? [
					{
						label: 'Delete wrkspace',
						destructive: true,
						onclick: () => {
							deleteOpen = true;
						}
					}
				]
			: [])
	]);
</script>

<header class="mb-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="font-display text-ink text-2xl font-semibold">{name}</h1>
		<DropdownMenu align="end" items={menuItems}>
			{#snippet trigger()}
				<span class="sr-only"><BrandText text="wrkspace settings" /></span>
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
	{#if description}
		<p class="text-ink-muted mt-1 max-w-xl text-sm">{description}</p>
	{/if}
</header>

<DeleteWrkspaceDialog bind:open={deleteOpen} {name} />
