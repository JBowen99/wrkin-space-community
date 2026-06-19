<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon, Folder01Icon } from '@hugeicons/core-free-icons';
	import type { DocsMoveFolderTree } from '$lib/shared/docs-library';
	import Dialog from '../../ui/dialog.svelte';
	import Button from '../../ui/button.svelte';

	type Props = {
		open?: boolean;
		itemLabel: string;
		tree: DocsMoveFolderTree;
		sourceFolderId: string | null;
		loading?: boolean;
		onMove: (targetFolderId: string | null) => void;
	};

	let {
		open = $bindable(false),
		itemLabel,
		tree,
		sourceFolderId,
		loading = false,
		onMove
	}: Props = $props();

	let browseFolderId = $state<string | null>(null);

	$effect(() => {
		if (open) {
			browseFolderId = null;
		}
	});

	const folderById = $derived(new Map(tree.folders.map((f) => [f.id, f])));

	const breadcrumbs = $derived.by(() => {
		const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Library' }];
		if (!browseFolderId) return crumbs;

		const chain: { id: string; name: string }[] = [];
		let current: string | null = browseFolderId;
		while (current) {
			const folder = folderById.get(current);
			if (!folder) break;
			chain.unshift({ id: folder.id, name: folder.name });
			current = folder.parentId;
		}
		for (const c of chain) {
			crumbs.push(c);
		}
		return crumbs;
	});

	const childFolders = $derived(
		tree.folders
			.filter((f) => f.parentId === browseFolderId)
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	function folderHasChildren(folderId: string): boolean {
		return tree.folders.some((f) => f.parentId === folderId);
	}

	const destinationLabel = $derived(
		browseFolderId ? (folderById.get(browseFolderId)?.name ?? 'Folder') : 'Library'
	);

	const canMoveHere = $derived(
		browseFolderId !== sourceFolderId && (browseFolderId === null ? tree.canEditRoot : true)
	);
</script>

<Dialog bind:open title="Move item" description="Choose a folder for “{itemLabel}”.">
	<div class="flex flex-col gap-3">
		<nav
			class="text-ink-muted flex flex-wrap items-center gap-1 text-sm"
			aria-label="Folder location"
		>
			{#each breadcrumbs as crumb, i (crumb.id ?? 'root')}
				{#if i > 0}
					<span aria-hidden="true">/</span>
				{/if}
				{#if i < breadcrumbs.length - 1}
					<button
						type="button"
						class="hover:text-accent"
						onclick={() => {
							browseFolderId = crumb.id;
						}}
					>
						{crumb.name}
					</button>
				{:else}
					<span class="text-ink font-medium">{crumb.name}</span>
				{/if}
			{/each}
		</nav>

		<p class="text-ink-muted text-xs">
			Destination: <span class="text-ink font-medium">{destinationLabel}</span>
		</p>

		<ul
			class="border-border max-h-[min(40vh,16rem)] overflow-y-auto rounded-lg border"
			role="listbox"
			aria-label="Folders"
		>
			{#if childFolders.length === 0}
				<li class="text-ink-muted px-3 py-4 text-center text-sm">No subfolders here.</li>
			{:else}
				{#each childFolders as folder (folder.id)}
					<li>
						<button
							type="button"
							class="text-ink hover:bg-surface-hover flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition"
							onclick={() => {
								browseFolderId = folder.id;
							}}
						>
							<HugeiconsIcon
								icon={Folder01Icon}
								size={18}
								color="currentColor"
								class="text-accent shrink-0"
								aria-hidden={true}
							/>
							<span class="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
							{#if folderHasChildren(folder.id)}
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									size={16}
									color="currentColor"
									class="text-ink-muted shrink-0"
									aria-hidden={true}
								/>
							{/if}
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	</div>

	<div class="mt-4 flex justify-end gap-2">
		<Button type="button" variant="secondary" onclick={() => (open = false)}>Cancel</Button>
		<Button type="button" disabled={loading || !canMoveHere} onclick={() => onMove(browseFolderId)}>
			{loading ? 'Moving…' : 'Move'}
		</Button>
	</div>
</Dialog>
