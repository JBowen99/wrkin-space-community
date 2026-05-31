<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Link01Icon } from '@hugeicons/core-free-icons';
	import DocEditorToolbarPanel from '../docs/doc-editor-toolbar-panel.svelte';
	import { normalizeLinkUrl } from '$lib/shared/doc-editor';
	import {
		captureSelection,
		hasRangeSelection,
		preventEditorBlur,
		type EditorSelectionRange
	} from '$lib/shared/doc-editor-selection';
	import { registerLinkPopoverOpener, unregisterLinkPopoverOpener } from '$lib/shared/doc-editor-ui';

	type Props = {
		editor: Editor;
	};

	let { editor }: Props = $props();

	let open = $state(false);
	let url = $state('');
	let urlInput = $state<HTMLInputElement | null>(null);
	let savedSelection = $state<EditorSelectionRange | null>(null);

	const isLinkActive = $derived(editor.isActive('link'));

	function syncUrlFromEditor() {
		if (editor.isActive('link')) {
			url = (editor.getAttributes('link').href as string) ?? '';
		} else {
			url = '';
		}
	}

	function onPanelOpen() {
		savedSelection = captureSelection(editor);
		syncUrlFromEditor();
		queueMicrotask(() => urlInput?.focus());
	}

	function onPanelClose() {
		savedSelection = null;
	}

	function openPopover() {
		onPanelOpen();
		open = true;
	}

	function applyLink() {
		const href = normalizeLinkUrl(url);
		const sel = savedSelection ?? captureSelection(editor);

		if (!href) {
			editor.chain().focus().setTextSelection(sel).extendMarkRange('link').unsetLink().run();
		} else if (!hasRangeSelection(sel)) {
			editor
				.chain()
				.focus()
				.setTextSelection(sel)
				.insertContent({
					type: 'text',
					text: href,
					marks: [{ type: 'link', attrs: { href } }]
				})
				.run();
		} else {
			editor.chain().focus().setTextSelection(sel).setLink({ href }).run();
		}

		open = false;
		savedSelection = null;
	}

	function removeLink() {
		const sel = savedSelection ?? captureSelection(editor);
		editor.chain().focus().setTextSelection(sel).extendMarkRange('link').unsetLink().run();
		url = '';
		open = false;
		savedSelection = null;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			applyLink();
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
		}
	}

	onMount(() => {
		registerLinkPopoverOpener(openPopover);
	});

	onDestroy(() => {
		unregisterLinkPopoverOpener(openPopover);
	});
</script>

<DocEditorToolbarPanel bind:open onOpen={onPanelOpen} onClose={onPanelClose}>
	{#snippet trigger({ toggle, open: isOpen })}
		<button
			type="button"
			class="toolbar-icon-btn"
			class:active={isLinkActive || isOpen}
			title="Link (Ctrl+K)"
			onmousedown={preventEditorBlur}
			onclick={toggle}
		>
			<HugeiconsIcon
				icon={Link01Icon}
				size={18}
				color="currentColor"
				strokeWidth={2}
				aria-hidden={true}
			/>
		</button>
	{/snippet}
	{#snippet content()}
		<div class="link-popover w-64 space-y-2 p-1">
			<label class="block text-xs font-medium text-ink-muted" for="doc-link-url">URL</label>
			<input
				id="doc-link-url"
				type="url"
				placeholder="https://example.com"
				bind:this={urlInput}
				bind:value={url}
				class="link-url-input"
				onkeydown={onKeydown}
			/>
			{#if savedSelection && !hasRangeSelection(savedSelection)}
				<p class="link-hint">Tip: select text first to turn it into a link.</p>
			{/if}
			<div class="flex justify-end gap-1.5 pt-1">
				{#if isLinkActive}
					<button
						type="button"
						class="link-popover-btn link-popover-btn-muted"
						onmousedown={preventEditorBlur}
						onclick={removeLink}
					>
						Remove
					</button>
				{/if}
				<button
					type="button"
					class="link-popover-btn link-popover-btn-primary"
					onmousedown={preventEditorBlur}
					onclick={applyLink}
				>
					Apply
				</button>
			</div>
		</div>
	{/snippet}
</DocEditorToolbarPanel>

<style>
	.link-hint {
		font-size: 0.625rem;
		line-height: 1.3;
		color: var(--color-ink-muted);
	}

	.link-popover-btn {
		border-radius: 0.375rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.link-popover-btn-muted {
		color: var(--color-ink-muted);
	}

	.link-popover-btn-muted:hover {
		background: color-mix(in srgb, var(--color-border) 40%, transparent);
		color: var(--color-ink);
	}

	.link-popover-btn-primary {
		background: var(--color-accent);
		color: white;
	}

	.link-popover-btn-primary:hover {
		filter: brightness(1.05);
	}

	.link-url-input {
		width: 100%;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface-raised);
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-ink);
	}

	.link-url-input::placeholder {
		color: var(--color-ink-muted);
	}

	.link-url-input:focus {
		border-color: var(--color-accent);
		outline: 2px solid color-mix(in srgb, var(--color-accent) 20%, transparent);
	}
</style>
