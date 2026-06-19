<script lang="ts">
	import Dialog from '../../ui/dialog.svelte';
	import AlertDialog from '../../ui/alert-dialog.svelte';
	import Select from '../../ui/select.svelte';
	import Button from '../../ui/button.svelte';
	import type { DocsLibraryMember } from '$lib/server/docs-library';
	import type { DocsFolderGrantLevel } from '$lib/shared/docs-library';

	type GrantRow = {
		userId: string;
		level: DocsFolderGrantLevel;
	};

	type Props = {
		open?: boolean;
		folderName: string;
		members: DocsLibraryMember[];
		ownerUserId: string | null;
		isOwner: boolean;
		initialGrants: { userId: string; level: DocsFolderGrantLevel }[];
		loading?: boolean;
		onSave: (payload: {
			grants: { userId: string; level: DocsFolderGrantLevel }[];
			ownerUserId: string | null;
		}) => void;
	};

	let {
		open = $bindable(false),
		folderName,
		members,
		ownerUserId: initialOwnerUserId,
		isOwner,
		initialGrants,
		loading = false,
		onSave
	}: Props = $props();

	let rows = $state<GrantRow[]>([]);
	let addMemberId = $state('');
	let addMemberLevel = $state<DocsFolderGrantLevel>('view');
	let ownerUserId = $state<string | null>(null);
	let pendingOwnerChange = $state<string | null>(null);

	const pendingOwnerName = $derived(
		pendingOwnerChange ? members.find((m) => m.userId === pendingOwnerChange)?.name ?? '' : ''
	);

	$effect(() => {
		if (open) {
			rows = initialGrants.map((g) => ({ userId: g.userId, level: g.level }));
			ownerUserId = initialOwnerUserId;
			addMemberId = '';
			addMemberLevel = 'view';
		}
	});

	const levelOptions = [
		{ value: 'view', label: 'Can view' },
		{ value: 'edit', label: 'Can edit' }
	];

	const availableMembers = $derived(
		members.filter((m) => m.userId !== ownerUserId && !rows.some((r) => r.userId === m.userId))
	);

	const transferOwnerOptions = $derived(members.map((m) => ({ value: m.userId, label: m.name })));

	const isRestricted = $derived(rows.length > 0);
	const isAdmin = $derived(!isOwner);

	function addMember() {
		if (!addMemberId || rows.some((r) => r.userId === addMemberId)) return;
		rows = [...rows, { userId: addMemberId, level: addMemberLevel }];
		addMemberId = '';
		addMemberLevel = 'view';
	}

	function removeRow(userId: string) {
		rows = rows.filter((r) => r.userId !== userId);
	}

	function handleSave() {
		onSave({
			grants: rows.map((r) => ({ userId: r.userId, level: r.level })),
			ownerUserId
		});
	}
</script>

<Dialog bind:open title="Folder sharing — {folderName}">
	<div class="flex flex-col gap-4">
		{#if isAdmin}
			<p class="text-ink-muted text-xs">
				You can manage sharing on this folder because you are a wrkspace admin. Admins can view and
				edit all folders.
			</p>
		{/if}

		<div class="border-border bg-surface rounded-lg border px-3 py-3">
			<p class="text-ink-muted text-xs font-medium">Folder owner</p>
			<p class="text-ink mt-1 text-sm">
				The owner can always view and edit this folder and is the only person who can change sharing
				settings.
			</p>
			<div class="mt-3">
				<Select
					options={transferOwnerOptions}
					value={ownerUserId ?? ''}
					placeholder="Select owner…"
					class="mt-0"
					onValueChange={(v) => {
						if (v && v !== initialOwnerUserId && open) {
							pendingOwnerChange = v;
						} else {
							ownerUserId = v || null;
						}
					}}
				/>
			</div>
		</div>

		<div class="flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
			{#if rows.length === 0}
				<p
					class="border-border text-ink-muted rounded-lg border border-dashed px-3 py-4 text-center text-sm"
				>
					No members added — folder is open to the wrkspace.
				</p>
			{:else if !isAdmin}
				<p class="text-ink-muted px-1 text-xs">
					Wrkspace admins can always view and edit this folder, regardless of these settings.
				</p>
			{/if}
			{#each rows as row (row.userId)}
				{@const member = members.find((m) => m.userId === row.userId)}
				<div class="border-border bg-surface flex items-center gap-2 rounded-lg border px-2 py-1.5">
					<span class="text-ink min-w-0 flex-1 truncate text-sm font-medium">
						{member?.name ?? row.userId}
					</span>
					<div class="w-36">
						<Select
							options={[...levelOptions]}
							value={row.level}
							placeholder="Access"
							class="mt-0"
							onValueChange={(v) => {
								rows = rows.map((r) =>
									r.userId === row.userId ? { ...r, level: v as DocsFolderGrantLevel } : r
								);
							}}
						/>
					</div>
					<Button
						type="button"
						variant="ghost"
						class="shrink-0 px-2"
						onclick={() => removeRow(row.userId)}
					>
						Remove
					</Button>
				</div>
			{/each}
		</div>

		{#if availableMembers.length > 0}
			<div class="border-border flex flex-col gap-2 border-t pt-3">
				<p class="text-ink-muted text-xs font-medium">Add member</p>
				<div class="flex flex-wrap items-end gap-2">
					<div class="min-w-0 flex-1">
						<Select
							options={availableMembers.map((m) => ({ value: m.userId, label: m.name }))}
							value={addMemberId}
							placeholder="Select member…"
							class="mt-0"
							onValueChange={(v) => {
								addMemberId = v;
							}}
						/>
					</div>
					<div class="w-36">
						<Select
							options={[...levelOptions]}
							value={addMemberLevel}
							placeholder="Access"
							class="mt-0"
							onValueChange={(v) => {
								addMemberLevel = v as DocsFolderGrantLevel;
							}}
						/>
					</div>
					<Button type="button" variant="secondary" disabled={!addMemberId} onclick={addMember}>
						Add
					</Button>
				</div>
			</div>
		{/if}
	</div>
	<div class="mt-4 flex justify-end gap-2">
		<Button type="button" variant="secondary" onclick={() => (open = false)}>Cancel</Button>
		<Button type="button" disabled={loading || !ownerUserId} onclick={handleSave}>
			{loading ? 'Saving…' : 'Save'}
		</Button>
	</div>
</Dialog>

<AlertDialog
	open={pendingOwnerChange !== null}
	onOpenChange={(value) => {
		if (!value) pendingOwnerChange = null;
	}}
	title="Transfer ownership?"
	description={pendingOwnerChange ? `Make ${pendingOwnerName} the owner of this folder?` : ''}
	actionLabel="Transfer ownership"
	cancelLabel="Cancel"
	destructive
	onConfirm={() => {
		if (pendingOwnerChange) {
			ownerUserId = pendingOwnerChange;
		}
		pendingOwnerChange = null;
	}}
>
	{#if isOwner}
		<p class="text-ink-muted text-sm">
			You will no longer be the owner of this folder and will not be able to change its sharing
			settings. Only the new owner can transfer ownership back.
		</p>
	{:else}
		<p class="text-ink-muted text-sm">
			{pendingOwnerName} will become the folder owner and will be the only person who can change
			sharing settings (unless you are a wrkspace admin).
		</p>
	{/if}
</AlertDialog>
