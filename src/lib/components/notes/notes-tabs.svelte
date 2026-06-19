<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon, Add01Icon, ChevronLeft, ChevronRight } from '@hugeicons/core-free-icons';
	import ButtonUi from '../ui/button.svelte';
	import IconButton from '../ui/icon-button.svelte';

	export type NoteSummary = {
		id: string;
		title: string;
	};

	type Props = {
		notes: NoteSummary[];
		activeNoteId: string | null;
		onSelect: (noteId: string) => void;
		onAdd: () => void;
		onDelete: (noteId: string) => void;
		onRename: (noteId: string, title: string) => void;
	};

	let { notes, activeNoteId, onSelect, onAdd, onDelete, onRename }: Props = $props();

	let editingId: string | null = $state(null);
	let editValue: string = $state('');
	let editInput: HTMLInputElement | null = $state(null);
	let scrollEl: HTMLDivElement | null = $state(null);
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	function updateScrollState() {
		if (!scrollEl) return;
		canScrollLeft = scrollEl.scrollLeft > 0;
		canScrollRight = scrollEl.scrollLeft + scrollEl.clientWidth < scrollEl.scrollWidth - 1;
	}

	function scrollLeft() {
		if (!scrollEl) return;
		scrollEl.scrollBy({ left: -120, behavior: 'smooth' });
	}

	function scrollRight() {
		if (!scrollEl) return;
		scrollEl.scrollBy({ left: 120, behavior: 'smooth' });
	}

	function startRename(note: NoteSummary) {
		editingId = note.id;
		editValue = note.title;
		setTimeout(() => editInput?.focus(), 0);
	}

	function commitRename() {
		if (editingId && editValue.trim()) {
			onRename(editingId, editValue.trim());
		}
		editingId = null;
		editValue = '';
	}

	function cancelRename() {
		editingId = null;
		editValue = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			commitRename();
		} else if (e.key === 'Escape') {
			cancelRename();
		}
	}
</script>

<div class="note-tabs-bar border-border border-b">
	{#if canScrollLeft}
		<button class="note-tabs-arrow" onclick={scrollLeft} title="Scroll left">
			<HugeiconsIcon icon={ChevronLeft} size={14} color="currentColor" strokeWidth={2} />
		</button>
	{/if}

	<div
		bind:this={scrollEl}
		class="note-tabs-scroll"
		onclick={updateScrollState}
		onscroll={updateScrollState}
	>
		<div class="note-tabs-inner" role="tablist">
			{#each notes as note (note.id)}
				<button
					role="tab"
					aria-selected={note.id === activeNoteId}
					class="note-tab {note.id === activeNoteId ? 'active' : ''}"
					onclick={() => onSelect(note.id)}
					ondblclick={() => startRename(note)}
					title={note.title}
				>
					{#if editingId === note.id}
						<input
							bind:this={editInput}
							bind:value={editValue}
							class="note-tab-input"
							onblur={commitRename}
							onkeydown={onKeydown}
							onclick={(e) => e.stopPropagation()}
						/>
					{:else}
						<span class="note-tab-title">{note.title}</span>
					{/if}
					{#if note.id === activeNoteId}
						<IconButton
							label="Delete note"
							size="sm"
							variant="subtle"
							onclick={(e) => {
								e.stopPropagation();
								onDelete(note.id);
							}}
						>
							<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} />
						</IconButton>
					{/if}
				</button>
			{/each}

			<ButtonUi variant="unstyled" class="note-tab-add" title="New note" onclick={onAdd}>
				<HugeiconsIcon icon={Add01Icon} size={14} color="currentColor" strokeWidth={2} />
			</ButtonUi>
		</div>
	</div>

	{#if canScrollRight}
		<button class="note-tabs-arrow" onclick={scrollRight} title="Scroll right">
			<HugeiconsIcon icon={ChevronRight} size={14} color="currentColor" strokeWidth={2} />
		</button>
	{/if}
</div>

<style>
	.note-tabs-bar {
		display: flex;
		align-items: center;
		background: var(--color-surface-raised);
		flex-shrink: 0;
	}

	.note-tabs-scroll {
		flex: 1;
		min-width: 0;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.note-tabs-scroll::-webkit-scrollbar {
		display: none;
	}

	.note-tabs-inner {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: 0.125rem;
		min-width: min-content;
		padding: 0.375rem 0.5rem;
	}

	.note-tabs-arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		border: none;
		border-radius: 0.25rem;
		background: color-mix(in srgb, var(--color-border) 30%, var(--color-surface-raised));
		color: var(--color-ink-muted);
		cursor: pointer;
		transition:
			background 0.1s,
			color 0.1s;
	}

	.note-tabs-arrow:hover {
		background: color-mix(in srgb, var(--color-border) 55%, var(--color-surface-raised));
		color: var(--color-ink);
	}

	.note-tab {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
		max-width: 10rem;
		padding: 0.25rem 0.375rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-ink-muted);
		cursor: pointer;
		transition:
			background 0.1s,
			color 0.1s;
		white-space: nowrap;
		border: none;
		background: none;
	}

	.note-tab:hover {
		background: color-mix(in srgb, var(--color-border) 40%, transparent);
		color: var(--color-ink);
	}

	.note-tab.active {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
	}

	.note-tab-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.note-tab-input {
		width: 6rem;
		padding: 0 0.25rem;
		border: 1px solid var(--color-accent);
		border-radius: 0.25rem;
		background: var(--color-surface);
		color: var(--color-ink);
		font-size: 0.75rem;
		font-weight: 500;
		outline: none;
	}

	:global(.note-tab-add) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		border-radius: 0.375rem;
		color: var(--color-ink-muted);
	}

	:global(.note-tab-add:hover) {
		background: color-mix(in srgb, var(--color-border) 40%, transparent);
		color: var(--color-ink);
	}
</style>
