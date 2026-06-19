<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Link01Icon } from '@hugeicons/core-free-icons';
	import DocEditorToolbarPanel from '../docs/doc-editor-toolbar-panel.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Input from '../../ui/input.svelte';
	import Label from '../../ui/label.svelte';
	import { normalizeLinkUrl } from '$lib/shared/doc-editor';
	import {
		captureSelection,
		hasRangeSelection,
		preventEditorBlur,
		type EditorSelectionRange
	} from '$lib/shared/doc-editor-selection';
	import {
		registerLinkPopoverOpener,
		unregisterLinkPopoverOpener
	} from '$lib/shared/doc-editor-ui';

	type Props = {
		editor: Editor;
	};

	let { editor }: Props = $props();

	let open = $state(false);
	let url = $state('');
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
		queueMicrotask(() => document.getElementById('doc-link-url')?.focus());
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
		<ButtonUi
			variant="unstyled"
			class="toolbar-icon-btn{isLinkActive || isOpen ? ' active' : ''}"
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
		</ButtonUi>
	{/snippet}
	{#snippet content()}
		<div class="link-popover w-64 space-y-2 p-1">
			<Label for="doc-link-url" class="text-ink-muted text-xs">URL</Label>
			<Input
				id="doc-link-url"
				type="url"
				placeholder="https://example.com"
				bind:value={url}
				class="mt-1"
				onkeydown={onKeydown}
			/>
			{#if savedSelection && !hasRangeSelection(savedSelection)}
				<p class="link-hint">Tip: select text first to turn it into a link.</p>
			{/if}
			<div class="flex justify-end gap-1.5 pt-1">
				{#if isLinkActive}
					<ButtonUi
						variant="unstyled"
						class="link-popover-btn link-popover-btn-muted"
						onmousedown={preventEditorBlur}
						onclick={removeLink}
					>
						Remove
					</ButtonUi>
				{/if}
				<ButtonUi
					variant="unstyled"
					class="link-popover-btn link-popover-btn-primary"
					onmousedown={preventEditorBlur}
					onclick={applyLink}
				>
					Apply
				</ButtonUi>
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
</style>
