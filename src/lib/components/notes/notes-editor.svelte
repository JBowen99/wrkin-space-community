<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import { noteEditorExtensions } from '$lib/shared/note-editor';
	import NotesToolbar from './notes-toolbar.svelte';

	type Props = {
		content: string;
		onUpdate: (html: string) => void;
	};

	let { content, onUpdate }: Props = $props();

	let element = $state<HTMLDivElement | null>(null);
	let editorState = $state<{ editor: Editor | null }>({ editor: null });

	onMount(() => {
		if (!element) return;

		const ed = new Editor({
			element,
			content,
			extensions: noteEditorExtensions,
			onTransaction: ({ editor: e }) => {
				editorState = { editor: e };
			},
			onUpdate: ({ editor: e }) => {
				onUpdate(e.getHTML());
			}
		});

		editorState = { editor: ed };
	});

	onDestroy(() => {
		editorState.editor?.destroy();
	});
</script>

<div class="note-editor flex min-h-0 flex-1 flex-col">
	<div class="note-editor-canvas relative min-h-0 flex-1 overflow-y-auto">
		<div
			bind:this={element}
			class="note-editor-content prose prose-sm text-ink prose-stone prose-headings:text-ink prose-strong:text-ink prose-code:text-ink max-w-none px-5 py-4 focus:outline-none"
		></div>
	</div>

	{#if editorState.editor}
		<NotesToolbar editor={editorState.editor} />
	{/if}
</div>

<style>
	.note-editor-canvas {
		background: var(--color-surface-raised);
	}

	:global(.note-editor .ProseMirror) {
		min-height: 12rem;
		outline: none;
		background-color: var(--color-surface-raised);
		color: var(--color-ink);
	}

	:global(.note-editor .ProseMirror :is(h1, h2, h3, h4, h5, h6, p, li, strong, b, em, i, code)) {
		color: inherit;
	}

	:global(.note-editor .ProseMirror pre) {
		background: color-mix(in srgb, var(--color-border) 30%, var(--color-surface-raised));
		border-radius: 0.375rem;
		font-family: ui-monospace, monospace;
		font-size: 0.8125rem;
		margin: 0.75rem 0;
		padding: 0.75rem 1rem;
		color: var(--color-ink);
	}

	:global(.note-editor .ProseMirror pre code) {
		background: none;
		padding: 0;
		color: inherit;
	}

	:global(.note-editor .ProseMirror :not(pre) > code) {
		background: color-mix(in srgb, var(--color-border) 40%, var(--color-surface-raised));
		border-radius: 0.25rem;
		padding: 0.125rem 0.35rem;
		font-size: 0.875em;
		color: var(--color-ink);
	}

	:global(.note-editor .ProseMirror .doc-editor-selection) {
		background-color: color-mix(in srgb, var(--color-accent) 25%, transparent);
	}

	:global(.note-editor .ProseMirror blockquote) {
		border-left: 3px solid var(--color-border);
		margin: 0.75rem 0;
		padding-left: 1rem;
		color: var(--color-ink-muted);
	}

	:global(.note-editor .ProseMirror u) {
		text-decoration: underline;
	}

	:global(.note-editor .ProseMirror mark) {
		border-radius: 0.125rem;
		padding: 0.05em 0.1em;
		color: inherit;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
	}

	:global(.note-editor .ProseMirror a) {
		color: var(--color-accent);
		text-decoration: underline;
		cursor: pointer;
	}

	:global(.note-editor .ProseMirror ul[data-type='taskList']) {
		list-style: none;
		margin: 0.5rem 0;
		padding: 0;
	}

	:global(.note-editor .ProseMirror ul[data-type='taskList'] li) {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		margin: 0.25rem 0;
	}

	:global(.note-editor .ProseMirror ul[data-type='taskList'] li > label) {
		flex-shrink: 0;
		margin-top: 0.2rem;
		user-select: none;
	}

	:global(.note-editor .ProseMirror ul[data-type='taskList'] li > div) {
		flex: 1;
		min-width: 0;
	}

	:global(.note-editor .ProseMirror ul[data-type='taskList'] li[data-checked='true'] > div) {
		opacity: 0.55;
		text-decoration: line-through;
	}
</style>
