<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import {
		DndController,
		DndDraggable,
		DndDroppable,
		DndProvider,
		sortable
	} from '@horuse/svelte-dnd';
	import { cursorOver, libraryGridCollision } from './docs-library-dnd';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Add01Icon } from '@hugeicons/core-free-icons';
	import type {
		DocsLibraryListItem,
		DocsLibraryPage,
		DocsMoveFolderTree
	} from '$lib/shared/docs-library';
	import type { DocsLibraryMember } from '$lib/server/docs-library';
	import { parseDocsLibrarySort, type DocsLibrarySort } from '$lib/shared/docs-library';
	import DocCard from './doc-card.svelte';
	import DocsFolderCard from './docs-folder-card.svelte';
	import DocsAssetCard from './docs-asset-card.svelte';
	import DocsAddLinkDialog from './docs-add-link-dialog.svelte';
	import DocsFolderShareDialog from './docs-folder-share-dialog.svelte';
	import DocsFolderColorDialog from './docs-folder-color-dialog.svelte';
	import DocsMoveDialog from './docs-move-dialog.svelte';
	import ContextMenu from '../../ui/context-menu.svelte';
	import Input from '../../ui/input.svelte';
	import Select from '../../ui/select.svelte';
	import Pagination from '../../ui/pagination.svelte';
	import Button from '../../ui/button.svelte';
	import DropdownMenu from '../../ui/dropdown-menu.svelte';
	import FileInput from '../../ui/file-input.svelte';
	import Dialog from '../../ui/dialog.svelte';
	import Label from '../../ui/label.svelte';
	import { toolbarControlClass } from '../../ui/field-styles';

	type LibraryItemTarget = {
		itemType: 'folder' | 'doc' | 'asset';
		itemId: string;
		itemLabel: string;
		sourceFolderId: string | null;
		folderColor?: string | null;
	};

	type Props = {
		libraryPage: DocsLibraryPage;
		libraryMembers: DocsLibraryMember[];
		moveFolderTree: DocsMoveFolderTree;
		moduleBasePath: string;
		docHref: (docId: string) => string;
		assetHref: (assetId: string) => string;
	};

	let { libraryPage, libraryMembers, moveFolderTree, moduleBasePath, docHref, assetHref }: Props =
		$props();

	const controller = new DndController();

	const dropZoneId = $derived(libraryPage.currentFolderId ?? 'library-root');

	function listItemKey(entry: DocsLibraryListItem): string {
		if (entry.kind === 'folder') return `folder-${entry.folder.id}`;
		if (entry.kind === 'doc') return `doc-${entry.doc.id}`;
		return `asset-${entry.asset.id}`;
	}

	function isDraggableEntry(entry: DocsLibraryListItem): boolean {
		if (entry.kind === 'folder') return false;
		if (entry.kind === 'doc') return entry.doc.canEdit;
		return entry.asset.canEdit;
	}

	/** Sortable slot index among grid draggables only (folders are drop targets, not slots). */
	function draggablePosition(itemIndex: number): number {
		let pos = 0;
		for (let i = 0; i < itemIndex; i++) {
			if (isDraggableEntry(libraryPage.items[i])) pos++;
		}
		return pos;
	}

	const sortOptions = [
		{ value: 'updated', label: 'Recently updated' },
		{ value: 'name', label: 'Name (A–Z)' },
		{ value: 'type', label: 'Type' },
		{ value: 'created', label: 'Oldest first' }
	] as const;

	let searchInput = $state('');
	let searchDebounce: ReturnType<typeof setTimeout> | undefined;
	let linkDialogOpen = $state(false);
	let folderDialogOpen = $state(false);
	let renameDialogOpen = $state(false);
	let renameFolderId = $state('');
	let renameFolderName = $state('');
	let colorDialogOpen = $state(false);
	let colorFolderId = $state('');
	let colorFolderName = $state('');
	let colorFolderColor = $state<string | null>(null);
	let shareDialogOpen = $state(false);
	let shareFolderId = $state('');
	let shareFolderName = $state('');
	let shareOwnerUserId = $state<string | null>(null);
	let shareIsOwner = $state(false);
	let shareInitialGrants = $state<{ userId: string; level: 'view' | 'edit' }[]>([]);
	let newFolderName = $state('');
	let uploadInput = $state<HTMLInputElement | null>(null);
	let actionLoading = $state(false);
	let moveDialogOpen = $state(false);
	let moveTarget = $state<LibraryItemTarget | null>(null);
	let deleteDialogOpen = $state(false);
	let deleteTarget = $state<LibraryItemTarget | null>(null);
	let deleteFolderNotEmpty = $state(false);

	function libraryItemContextItems(target: LibraryItemTarget) {
		const items: { label: string; onclick: () => void; destructive?: boolean }[] = [];

		if (target.itemType === 'folder') {
			items.push(
				{
					label: 'Rename',
					onclick: () => {
						renameFolderId = target.itemId;
						renameFolderName = target.itemLabel;
						renameDialogOpen = true;
					}
				},
				{
					label: 'Color',
					onclick: () => {
						colorFolderId = target.itemId;
						colorFolderName = target.itemLabel;
						colorFolderColor = target.folderColor ?? null;
						colorDialogOpen = true;
					}
				}
			);
		}

		items.push(
			{
				label: 'Move',
				onclick: () => {
					moveTarget = target;
					moveDialogOpen = true;
				}
			},
			{
				label: 'Delete',
				destructive: true,
				onclick: () => {
					deleteTarget = target;
					deleteFolderNotEmpty = false;
					deleteDialogOpen = true;
				}
			}
		);

		return items;
	}

	function folderTarget(folder: {
		id: string;
		name: string;
		color: string | null;
	}): LibraryItemTarget {
		return {
			itemType: 'folder',
			itemId: folder.id,
			itemLabel: folder.name,
			sourceFolderId: libraryPage.currentFolderId,
			folderColor: folder.color
		};
	}

	function docTarget(doc: { id: string; title: string }): LibraryItemTarget {
		return {
			itemType: 'doc',
			itemId: doc.id,
			itemLabel: doc.title,
			sourceFolderId: libraryPage.currentFolderId
		};
	}

	function assetTarget(asset: { id: string; title: string }): LibraryItemTarget {
		return {
			itemType: 'asset',
			itemId: asset.id,
			itemLabel: asset.title,
			sourceFolderId: libraryPage.currentFolderId
		};
	}

	$effect(() => {
		searchInput = libraryPage.q;
	});

	function folderHref(folderId: string | null): string {
		const url = new URL(page.url);
		if (folderId) {
			url.searchParams.set('folder', folderId);
		} else {
			url.searchParams.delete('folder');
		}
		url.searchParams.delete('page');
		const search = url.searchParams.toString();
		return `${url.pathname}${search ? `?${search}` : ''}`;
	}

	function navigateList(updates: {
		q?: string;
		sort?: DocsLibrarySort;
		page?: number;
		folder?: string | null;
	}) {
		const url = new URL(page.url);

		const nextFolder = updates.folder !== undefined ? updates.folder : libraryPage.currentFolderId;
		if (nextFolder) {
			url.searchParams.set('folder', nextFolder);
		} else {
			url.searchParams.delete('folder');
		}

		const nextQ = updates.q !== undefined ? updates.q.trim() : libraryPage.q;
		if (nextQ) {
			url.searchParams.set('q', nextQ);
		} else {
			url.searchParams.delete('q');
		}

		const nextSort = updates.sort ?? libraryPage.sort;
		if (nextSort === 'updated') {
			url.searchParams.delete('sort');
		} else {
			url.searchParams.set('sort', nextSort);
		}

		const nextPage = updates.page ?? 1;
		if (nextPage <= 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(nextPage));
		}

		const search = url.searchParams.toString();
		goto(`${url.pathname}${search ? `?${search}` : ''}`, { keepFocus: true, invalidateAll: true });
	}

	function onSearchInput() {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			if (searchInput.trim() === libraryPage.q.trim()) return;
			navigateList({ q: searchInput, page: 1 });
		}, 300);
	}

	async function postAction(action: string, fields: Record<string, string>): Promise<boolean> {
		const formData = new FormData();
		for (const [key, value] of Object.entries(fields)) {
			formData.set(key, value);
		}

		const response = await fetch(`?/${action}`, {
			method: 'POST',
			body: formData
		});

		const text = await response.text();
		const result = deserialize(text);

		if (result.type === 'failure') {
			return false;
		}

		await invalidateAll();
		return true;
	}

	async function postFormAction(action: string, formData: FormData): Promise<boolean> {
		const response = await fetch(`?/${action}`, {
			method: 'POST',
			body: formData
		});
		const text = await response.text();
		const result = deserialize(text);
		if (result.type === 'failure') return false;
		await invalidateAll();
		return true;
	}

	function resolveTargetFolderId(targetId: string): string | null {
		if (targetId.startsWith('folder-')) {
			return targetId.slice('folder-'.length);
		}
		return null;
	}

	function resolveItemType(itemId: string): 'folder' | 'doc' | 'asset' | null {
		for (const entry of libraryPage.items) {
			if (entry.kind === 'folder' && entry.folder.id === itemId) return 'folder';
			if (entry.kind === 'doc' && entry.doc.id === itemId) return 'doc';
			if (entry.kind === 'asset' && entry.asset.id === itemId) return 'asset';
		}
		return null;
	}

	onMount(() => {
		const unsubscribe = controller.onDrop(async ({ item, source, target }) => {
			if (!target.id.startsWith('folder-')) return;

			const itemType = resolveItemType(item.id);
			if (!itemType) return;

			const targetFolderId = resolveTargetFolderId(target.id);
			if (!targetFolderId) return;

			if (itemType === 'folder' && item.id === targetFolderId) return;

			const sourceFolderId = libraryPage.currentFolderId;
			if (itemType !== 'folder' && targetFolderId === sourceFolderId) return;
			if (
				itemType === 'folder' &&
				source.id.startsWith('folder-') &&
				targetFolderId === sourceFolderId
			) {
				return;
			}

			const ok = await postAction('moveItem', {
				itemType,
				itemId: item.id,
				targetFolderId
			});
			if (!ok) {
				await invalidateAll();
			}
		});

		return unsubscribe;
	});

	async function handleCreateFolder() {
		if (!newFolderName.trim()) return;
		actionLoading = true;
		const ok = await postAction('createFolder', {
			name: newFolderName.trim(),
			parentId: libraryPage.currentFolderId ?? ''
		});
		actionLoading = false;
		if (ok) {
			folderDialogOpen = false;
			newFolderName = '';
		}
	}

	async function handleAddLink(url: string, title: string) {
		actionLoading = true;
		const ok = await postAction('createLink', {
			url,
			title,
			folderId: libraryPage.currentFolderId ?? ''
		});
		actionLoading = false;
		if (ok) linkDialogOpen = false;
	}

	async function handleUpload(file: File) {
		const formData = new FormData();
		formData.set('file', file);
		if (libraryPage.currentFolderId) {
			formData.set('folderId', libraryPage.currentFolderId);
		}
		actionLoading = true;
		await postFormAction('uploadAsset', formData);
		actionLoading = false;
	}

	async function handleSaveSharing(payload: {
		grants: { userId: string; level: 'view' | 'edit' }[];
		ownerUserId: string | null;
	}) {
		actionLoading = true;
		const ok = await postAction('updateFolderGrants', {
			folderId: shareFolderId,
			grants: JSON.stringify(payload.grants),
			ownerUserId: payload.ownerUserId ?? ''
		});
		actionLoading = false;
		if (ok) shareDialogOpen = false;
	}

	async function handleMoveTo(targetFolderId: string | null) {
		if (!moveTarget) return;
		actionLoading = true;
		const ok = await postAction('moveItem', {
			itemType: moveTarget.itemType,
			itemId: moveTarget.itemId,
			targetFolderId: targetFolderId ?? 'root'
		});
		actionLoading = false;
		if (ok) {
			moveDialogOpen = false;
			moveTarget = null;
		}
	}

	async function handleDeleteItem(force = false) {
		if (!deleteTarget) return;
		actionLoading = true;
		const formData = new FormData();
		formData.set('itemType', deleteTarget.itemType);
		formData.set('itemId', deleteTarget.itemId);
		if (force) {
			formData.set('force', 'true');
		}

		const response = await fetch('?/deleteLibraryItem', { method: 'POST', body: formData });
		const result = deserialize(await response.text());
		actionLoading = false;

		if (result.type === 'failure') {
			const code = (result.data as { code?: string } | undefined)?.code;
			if (deleteTarget.itemType === 'folder' && !force && code === 'folder_not_empty') {
				deleteFolderNotEmpty = true;
			}
			return;
		}

		const deleted = deleteTarget;
		deleteDialogOpen = false;
		deleteTarget = null;
		deleteFolderNotEmpty = false;

		if (deleted.itemType === 'folder' && deleted.itemId === libraryPage.currentFolderId) {
			const crumbs = libraryPage.breadcrumbs;
			const parentId = crumbs.length >= 2 ? crumbs[crumbs.length - 2].id : null;
			await goto(folderHref(parentId));
			return;
		}

		await invalidateAll();
	}

	async function handleRenameFolder() {
		if (!renameFolderName.trim() || !renameFolderId) return;
		actionLoading = true;
		const ok = await postAction('renameFolder', {
			folderId: renameFolderId,
			name: renameFolderName.trim()
		});
		actionLoading = false;
		if (ok) {
			renameDialogOpen = false;
			renameFolderId = '';
			renameFolderName = '';
		}
	}

	async function handleSaveFolderColor(color: string | null) {
		if (!colorFolderId) return;
		actionLoading = true;
		const ok = await postAction('setFolderColor', {
			folderId: colorFolderId,
			color: color ?? ''
		});
		actionLoading = false;
		if (ok) {
			colorDialogOpen = false;
			colorFolderId = '';
			colorFolderName = '';
			colorFolderColor = null;
		}
	}

	function openShare(folder: {
		id: string;
		name: string;
		ownerUserId: string | null;
		isOwner: boolean;
		grants: { userId: string; level: 'view' | 'edit' }[];
	}) {
		shareFolderId = folder.id;
		shareFolderName = folder.name;
		shareOwnerUserId = folder.ownerUserId;
		shareIsOwner = folder.isOwner;
		shareInitialGrants = folder.grants.map((g) => ({ ...g }));
		shareDialogOpen = true;
	}
</script>

<div class="mt-6 flex flex-col gap-4">
	<nav class="text-ink-muted flex flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
		{#each libraryPage.breadcrumbs as crumb, i (crumb.id ?? 'root')}
			{#if i > 0}
				<span aria-hidden="true">/</span>
			{/if}
			{#if i < libraryPage.breadcrumbs.length - 1}
				<a href={folderHref(crumb.id)} class="hover:text-accent">{crumb.name}</a>
			{:else}
				<span class="text-ink font-medium">{crumb.name}</span>
			{/if}
		{/each}
	</nav>

	<div class="border-border flex flex-wrap items-center gap-3 border-b pb-4">
		<div class="min-w-[10rem] flex-1">
			<Input
				id="docs-library-search"
				type="search"
				variant="inline"
				placeholder="Search library…"
				aria-label="Search library"
				bind:value={searchInput}
				oninput={onSearchInput}
				class="{toolbarControlClass} py-0"
			/>
		</div>
		<div class="w-full min-w-[10rem] sm:w-44">
			<Select
				variant="inline"
				options={[...sortOptions]}
				value={libraryPage.sort}
				placeholder="Sort by"
				onValueChange={(v) => navigateList({ sort: parseDocsLibrarySort(v), page: 1 })}
			/>
		</div>
		<DropdownMenu
			triggerVariant="action"
			items={[
				{
					label: 'New document',
					onclick: () => {
						const form = document.getElementById('docs-create-doc-form') as HTMLFormElement | null;
						form?.requestSubmit();
					}
				},
				...(libraryPage.canEditCurrentFolder
					? [
							{
								label: 'New folder',
								onclick: () => {
									folderDialogOpen = true;
								}
							},
							{
								label: 'Upload file',
								onclick: () => uploadInput?.click()
							},
							{
								label: 'Add link',
								onclick: () => {
									linkDialogOpen = true;
								}
							}
						]
					: [])
			]}
		>
			{#snippet trigger()}
				<HugeiconsIcon icon={Add01Icon} size={18} color="currentColor" aria-hidden={true} />
				New
			{/snippet}
		</DropdownMenu>
	</div>

	<form id="docs-create-doc-form" method="POST" action="?/createDoc" class="hidden">
		{#if libraryPage.currentFolderId}
			<input type="hidden" name="folderId" value={libraryPage.currentFolderId} />
		{/if}
	</form>

	<FileInput
		bind:input={uploadInput}
		accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
		class="sr-only"
		onchange={(e) => {
			const file = e.currentTarget.files?.[0];
			if (file) handleUpload(file);
			e.currentTarget.value = '';
		}}
	/>

	<section class="docs-library-grid" aria-label="Library items">
		<DndProvider {controller}>
			<DndDroppable
				id={dropZoneId}
				strategy={sortable({ layout: 'grid' })}
				collision={libraryGridCollision}
				accepts="library-item"
				class="docs-library-grid-dnd grid min-h-[12rem] grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4"
				spacing={16}
			>
				{#each libraryPage.items as entry, index (listItemKey(entry))}
					{#if entry.kind === 'folder'}
						<div class="docs-library-grid-item w-full min-w-0">
							{#if entry.folder.canEdit}
								<ContextMenu items={libraryItemContextItems(folderTarget(entry.folder))}>
									<DocsFolderCard
										folder={entry.folder}
										href={folderHref(entry.folder.id)}
										onShare={entry.folder.canManageSharing
											? () => openShare(entry.folder)
											: undefined}
									/>
								</ContextMenu>
							{:else}
								<DocsFolderCard
									folder={entry.folder}
									href={folderHref(entry.folder.id)}
									onShare={entry.folder.canManageSharing
										? () => openShare(entry.folder)
										: undefined}
								/>
							{/if}
						</div>
					{:else if entry.kind === 'doc'}
						{#if entry.doc.canEdit}
							<DndDraggable
								id={entry.doc.id}
								type="library-item"
								position={draggablePosition(index)}
								class="w-full min-w-0 cursor-grab self-start active:cursor-grabbing"
							>
								<ContextMenu items={libraryItemContextItems(docTarget(entry.doc))}>
									<DocCard doc={entry.doc} href={docHref(entry.doc.id)} />
								</ContextMenu>
							</DndDraggable>
						{:else}
							<div class="docs-library-grid-item w-full min-w-0">
								<DocCard doc={entry.doc} href={docHref(entry.doc.id)} />
							</div>
						{/if}
					{:else if entry.asset.canEdit}
						<DndDraggable
							id={entry.asset.id}
							type="library-item"
							position={draggablePosition(index)}
							class="w-full min-w-0 cursor-grab self-start active:cursor-grabbing"
						>
							<ContextMenu items={libraryItemContextItems(assetTarget(entry.asset))}>
								<DocsAssetCard asset={entry.asset} href={assetHref(entry.asset.id)} />
							</ContextMenu>
						</DndDraggable>
					{:else}
						<div class="docs-library-grid-item w-full min-w-0">
							<DocsAssetCard asset={entry.asset} href={assetHref(entry.asset.id)} />
						</div>
					{/if}
				{/each}
				{#if libraryPage.canEditCurrentFolder}
					<button
						type="button"
						class="border-border bg-surface/50 text-ink-muted hover:border-accent/50 hover:bg-surface-raised hover:text-accent flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-sm transition"
						onclick={() =>
							(
								document.getElementById('docs-create-doc-form') as HTMLFormElement | null
							)?.requestSubmit()}
					>
						<HugeiconsIcon icon={Add01Icon} size={24} color="currentColor" aria-hidden={true} />
						New document
					</button>
				{/if}
			</DndDroppable>
		</DndProvider>
	</section>

	{#if libraryPage.totalCount === 0}
		<p class="text-ink-muted py-8 text-center text-sm">
			{#if libraryPage.q}
				No items match your search.
			{:else if libraryPage.currentFolderId}
				This folder is empty.
			{:else}
				Your library is empty. Create a document, upload a file, or add a link.
			{/if}
		</p>
	{/if}

	<Pagination
		count={libraryPage.totalCount}
		perPage={libraryPage.perPage}
		page={libraryPage.page}
		onPageChange={(p) => navigateList({ page: p })}
		class="mt-2"
	/>
</div>

<Dialog
	bind:open={folderDialogOpen}
	title="New folder"
	description="Create a folder in the current location."
>
	<form
		class="flex flex-col gap-4"
		onsubmit={(e) => {
			e.preventDefault();
			handleCreateFolder();
		}}
	>
		<div>
			<Label for="folder-name">Name</Label>
			<Input id="folder-name" bind:value={newFolderName} placeholder="Folder name" required />
		</div>
		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={() => (folderDialogOpen = false)}
				>Cancel</Button
			>
			<Button type="submit" disabled={actionLoading || !newFolderName.trim()}>Create</Button>
		</div>
	</form>
</Dialog>

<Dialog
	bind:open={renameDialogOpen}
	title="Rename folder"
	description="Update the folder name shown in the library."
>
	<form
		class="flex flex-col gap-4"
		onsubmit={(e) => {
			e.preventDefault();
			handleRenameFolder();
		}}
	>
		<div>
			<Label for="rename-folder-name">Name</Label>
			<Input
				id="rename-folder-name"
				bind:value={renameFolderName}
				placeholder="Folder name"
				required
			/>
		</div>
		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={() => (renameDialogOpen = false)}
				>Cancel</Button
			>
			<Button type="submit" disabled={actionLoading || !renameFolderName.trim()}>Save</Button>
		</div>
	</form>
</Dialog>

<DocsAddLinkDialog bind:open={linkDialogOpen} loading={actionLoading} onSubmit={handleAddLink} />

<DocsFolderShareDialog
	bind:open={shareDialogOpen}
	folderName={shareFolderName}
	members={libraryMembers}
	ownerUserId={shareOwnerUserId}
	isOwner={shareIsOwner}
	initialGrants={shareInitialGrants}
	loading={actionLoading}
	onSave={handleSaveSharing}
/>

<DocsFolderColorDialog
	bind:open={colorDialogOpen}
	folderName={colorFolderName}
	initialColor={colorFolderColor}
	loading={actionLoading}
	onSave={handleSaveFolderColor}
/>

<DocsMoveDialog
	bind:open={moveDialogOpen}
	itemLabel={moveTarget?.itemLabel ?? 'Item'}
	tree={moveFolderTree}
	sourceFolderId={moveTarget?.sourceFolderId ?? null}
	loading={actionLoading}
	onMove={handleMoveTo}
/>

<Dialog
	bind:open={deleteDialogOpen}
	title={deleteTarget?.itemType === 'folder' ? 'Delete folder?' : 'Delete item?'}
	description={deleteTarget
		? deleteTarget.itemType === 'folder'
			? deleteFolderNotEmpty
				? `“${deleteTarget.itemLabel}” is not empty. Remove or move its contents first, or delete anyway — nested folders are removed and documents and files move to the library root.`
				: `“${deleteTarget.itemLabel}” will be deleted. Only empty folders can be removed without moving contents.`
			: `“${deleteTarget.itemLabel}” will be permanently deleted. This cannot be undone.`
		: undefined}
>
	<div class="flex flex-wrap justify-end gap-2">
		<Button
			type="button"
			variant="secondary"
			onclick={() => {
				deleteDialogOpen = false;
				deleteTarget = null;
				deleteFolderNotEmpty = false;
			}}
		>
			Cancel
		</Button>
		{#if deleteTarget?.itemType === 'folder' && deleteFolderNotEmpty}
			<Button
				type="button"
				variant="ghost"
				class="text-danger hover:bg-danger-muted"
				disabled={actionLoading}
				onclick={() => handleDeleteItem(true)}
			>
				{actionLoading ? 'Deleting…' : 'Delete anyway'}
			</Button>
		{:else}
			<Button
				type="button"
				variant="ghost"
				class="text-danger hover:bg-danger-muted"
				disabled={actionLoading || !deleteTarget}
				onclick={() => handleDeleteItem(false)}
			>
				{actionLoading ? 'Deleting…' : 'Delete'}
			</Button>
		{/if}
	</div>
</Dialog>

<style>
	.docs-library-grid {
		--dnd-preview-bg: color-mix(in srgb, var(--color-accent-muted) 50%, transparent);
		--dnd-preview-border: 2px dashed color-mix(in srgb, var(--color-accent) 45%, transparent);
		--dnd-preview-border-radius: 0.75rem;
	}

	/* Prevent native link/image drag (see module-card `draggable="false"`) */
	.docs-library-grid :global(.dnd-draggable a[href]),
	.docs-library-grid :global(.dnd-draggable img) {
		-webkit-user-drag: none;
		user-drag: none;
	}

	/* DnD tail preview + spacer nodes must not occupy grid cells (see module-grid) */
	.docs-library-grid
		:global(.docs-library-grid-dnd > div:not([data-dnd-slot]):not(.docs-library-grid-item)) {
		position: absolute;
		width: 0;
		height: 0;
		overflow: visible;
		pointer-events: none;
	}
</style>
