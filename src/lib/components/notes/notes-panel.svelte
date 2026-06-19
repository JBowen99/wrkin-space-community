<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { StickyNoteIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
	import DialogUi from '../ui/dialog.svelte';
	import ButtonUi from '../ui/button.svelte';
	import IconButton from '../ui/icon-button.svelte';
	import NotesTabs from './notes-tabs.svelte';
	import type { NoteSummary } from './notes-tabs.svelte';
	import NotesEditor from './notes-editor.svelte';

	type NoteData = {
		id: string;
		title: string;
		content: string;
		updatedAt: string;
	};

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	};

	let { open = $bindable(false), onOpenChange }: Props = $props();

	let notes = $state<NoteData[]>([]);
	let activeNoteId = $state<string | null>(null);
	let loading = $state(false);
	let deleteConfirmOpen = $state(false);
	let pendingDeleteId: string | null = $state(null);
	let editorHtml = $state('');

	const activeNote = $derived(notes.find((n) => n.id === activeNoteId) ?? null);

	const activeContent = $derived(activeNote?.content ?? '');

	const noteSummaries = $derived<NoteSummary[]>(notes.map((n) => ({ id: n.id, title: n.title })));

	let loaded = false;

	async function loadNotes() {
		if (loaded) return;
		loading = true;
		try {
			const res = await fetch('/api/notes');
			if (res.ok) {
				notes = (await res.json()) as NoteData[];
				if (notes.length > 0 && !activeNoteId) {
					activeNoteId = notes[0].id;
				}
			}
		} finally {
			loading = false;
			loaded = true;
		}
	}

	$effect(() => {
		if (open) {
			loaded = false;
			loadNotes();
		}
	});

	async function handleAdd() {
		const res = await fetch('/api/notes', { method: 'POST' });
		if (res.ok) {
			const { id } = (await res.json()) as { id: string };
			const now = new Date().toISOString();
			const newNote: NoteData = { id, title: 'Untitled Note', content: '', updatedAt: now };
			notes = [...notes, newNote];
			activeNoteId = id;
		}
	}

	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingSaveId: string | null = null;

	async function flushSave() {
		if (!pendingSaveId || !editorHtml) return;
		const id = pendingSaveId;
		const html = editorHtml;
		pendingSaveId = null;
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}

		const note = notes.find((n) => n.id === id);
		if (note) note.content = html;

		await fetch(`/api/notes/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content: html })
		});
	}

	function handleSelect(noteId: string) {
		if (noteId === activeNoteId) return;
		flushSave();
		activeNoteId = noteId;
	}

	async function handleRename(noteId: string, title: string) {
		const note = notes.find((n) => n.id === noteId);
		if (!note) return;
		note.title = title;

		const res = await fetch(`/api/notes/${noteId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title })
		});
		if (res.ok) {
			const updated = (await res.json()) as NoteData;
			note.updatedAt = updated.updatedAt;
		}
	}

	function handleDeleteRequest(noteId: string) {
		pendingDeleteId = noteId;
		deleteConfirmOpen = true;
	}

	async function confirmDelete() {
		if (!pendingDeleteId) return;
		const noteId = pendingDeleteId;
		pendingDeleteId = null;
		deleteConfirmOpen = false;

		const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
		if (res.ok) {
			notes = notes.filter((n) => n.id !== noteId);
			if (activeNoteId === noteId) {
				activeNoteId = notes.length > 0 ? notes[0].id : null;
			}
		}
	}

	function handleContentUpdate(html: string) {
		editorHtml = html;
		pendingSaveId = activeNoteId;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => flushSave(), 1000);
	}
</script>

{#if open}
	<div class="notes-widget">
		<div class="notes-widget-header">
			<div class="notes-widget-title">
				<HugeiconsIcon icon={StickyNoteIcon} size={16} color="currentColor" strokeWidth={2} />
				Notes
			</div>
			<div class="notes-widget-actions">
				<IconButton
					label="Close"
					size="sm"
					variant="subtle"
					onclick={() => {
						open = false;
						onOpenChange?.(false);
					}}
				>
					<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} />
				</IconButton>
			</div>
		</div>

		<NotesTabs
			notes={noteSummaries}
			{activeNoteId}
			onSelect={handleSelect}
			onAdd={handleAdd}
			onDelete={handleDeleteRequest}
			onRename={handleRename}
		/>

		<div class="notes-widget-body">
			{#if loading}
				<div class="notes-widget-empty">Loading…</div>
			{:else if activeNote}
				{#key activeNoteId}
					<NotesEditor content={activeContent} onUpdate={handleContentUpdate} />
				{/key}
			{:else}
				<div class="notes-widget-empty">
					<p>No notes yet</p>
					<button class="notes-widget-create" onclick={handleAdd}>Create a note</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<DialogUi bind:open={deleteConfirmOpen} title="Delete note?">
	{#snippet children()}
		<p class="text-ink-muted text-sm">This note will be permanently deleted.</p>
		<div class="mt-4 flex justify-end gap-2">
			<ButtonUi
				variant="secondary"
				onclick={() => {
					deleteConfirmOpen = false;
					pendingDeleteId = null;
				}}
			>
				Cancel
			</ButtonUi>
			<ButtonUi onclick={confirmDelete}>Delete</ButtonUi>
		</div>
	{/snippet}
</DialogUi>

<style>
	.notes-widget {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 50;
		width: 26rem;
		height: 26rem;
		display: flex;
		flex-direction: column;
		border-radius: 0.75rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface-raised);
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
		overflow: hidden;
	}

	.notes-widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-raised);
		flex-shrink: 0;
	}

	.notes-widget-title {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.notes-widget-actions {
		display: flex;
		align-items: center;
		gap: 0.125rem;
	}

	.notes-widget-body {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.notes-widget-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex: 1;
		color: var(--color-ink-muted);
		font-size: 0.8125rem;
	}

	.notes-widget-create {
		border: none;
		background: none;
		color: var(--color-accent);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
	}

	.notes-widget-create:hover {
		text-decoration: underline;
	}
</style>
