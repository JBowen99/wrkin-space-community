<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { HighlighterIcon } from '@hugeicons/core-free-icons';
	import ButtonUi from '../../ui/button.svelte';
	import DocEditorToolbarPanel from '../docs/doc-editor-toolbar-panel.svelte';
	import { DOC_HIGHLIGHT_COLORS } from '$lib/shared/doc-editor-highlight';
	import {
		captureSelection,
		hasRangeSelection,
		preventEditorBlur,
		type EditorSelectionRange
	} from '$lib/shared/doc-editor-selection';

	type Props = {
		editor: Editor;
	};

	let { editor }: Props = $props();

	let open = $state(false);
	let savedSelection = $state<EditorSelectionRange | null>(null);

	const isHighlightActive = $derived(editor.isActive('highlight'));

	function onPanelOpen() {
		savedSelection = captureSelection(editor);
	}

	function onPanelClose() {
		savedSelection = null;
	}

	function applyColor(color: string) {
		const sel = savedSelection;
		if (!sel || !hasRangeSelection(sel)) {
			open = false;
			return;
		}

		const chain = editor.chain().focus().setTextSelection(sel);
		if (editor.isActive('highlight', { color })) {
			chain.unsetHighlight().run();
		} else {
			chain.setHighlight({ color }).run();
		}

		open = false;
		savedSelection = null;
	}

	function clearHighlight() {
		const sel = savedSelection ?? captureSelection(editor);
		editor.chain().focus().setTextSelection(sel).unsetHighlight().run();
		open = false;
		savedSelection = null;
	}
</script>

<DocEditorToolbarPanel bind:open onOpen={onPanelOpen} onClose={onPanelClose}>
	{#snippet trigger({ toggle, open: isOpen })}
		<ButtonUi
			type="button"
			variant="unstyled"
			class="toolbar-icon-btn highlight-trigger{isHighlightActive || isOpen ? ' active' : ''}"
			title="Highlight"
			onmousedown={preventEditorBlur}
			onclick={toggle}
		>
			<HugeiconsIcon
				icon={HighlighterIcon}
				size={18}
				color="currentColor"
				strokeWidth={2}
				aria-hidden={true}
			/>
		</ButtonUi>
	{/snippet}
	{#snippet content()}
		<div class="highlight-popover">
			<p class="highlight-label">Highlight color</p>
			{#if savedSelection && !hasRangeSelection(savedSelection)}
				<p class="highlight-hint">Select text, then pick a color.</p>
			{/if}
			<div class="highlight-swatches" role="list">
				{#each DOC_HIGHLIGHT_COLORS as { name, value } (value)}
					<ButtonUi
						type="button"
						variant="unstyled"
						class="highlight-swatch{editor.isActive('highlight', { color: value })
							? ' active'
							: ''}"
						style="background-color: {value}"
						title={name}
						aria-label={name}
						onmousedown={preventEditorBlur}
						onclick={() => applyColor(value)}
					>
						<span class="sr-only">{name}</span>
					</ButtonUi>
				{/each}
			</div>
			{#if isHighlightActive}
				<ButtonUi
					variant="unstyled"
					class="highlight-clear"
					onmousedown={preventEditorBlur}
					onclick={clearHighlight}
				>
					Remove highlight
				</ButtonUi>
			{/if}
		</div>
	{/snippet}
</DocEditorToolbarPanel>

<style>
	.highlight-trigger.active {
		background: var(--color-accent-muted);
		color: var(--color-accent);
	}

	.highlight-popover {
		min-width: 10rem;
		padding: 0.25rem;
	}

	.highlight-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-ink-muted);
		margin-bottom: 0.5rem;
	}

	.highlight-hint {
		font-size: 0.625rem;
		line-height: 1.3;
		color: var(--color-ink-muted);
		margin-bottom: 0.5rem;
	}

	.highlight-swatches {
		display: flex;
		gap: 0.375rem;
	}

	.highlight-swatch {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 9999px;
		border: 2px solid transparent;
		cursor: pointer;
	}

	.highlight-swatch:hover {
		transform: scale(1.08);
	}

	.highlight-swatch.active {
		border-color: var(--color-ink);
	}

	.highlight-clear {
		margin-top: 0.5rem;
		width: 100%;
		border-radius: 0.375rem;
		padding: 0.25rem;
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		text-align: left;
	}

	.highlight-clear:hover {
		background: color-mix(in srgb, var(--color-border) 40%, transparent);
		color: var(--color-ink);
	}
</style>
