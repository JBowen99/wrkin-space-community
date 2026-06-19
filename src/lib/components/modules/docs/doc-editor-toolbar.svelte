<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		UndoIcon,
		RedoIcon,
		TextBoldIcon,
		TextItalicIcon,
		TextUnderlineIcon,
		TextAlignLeftIcon,
		TextAlignCenterIcon,
		TextAlignRightIcon,
		TextAlignJustifyCenterIcon,
		CheckListIcon,
		LeftToRightListBulletIcon,
		LeftToRightListNumberIcon,
		LeftToRightBlockQuoteIcon,
		CodeIcon
	} from '@hugeicons/core-free-icons';
	import ButtonUi from '../../ui/button.svelte';
	import DropdownMenu from '../../ui/dropdown-menu.svelte';
	import DocEditorLinkPopover from '../docs/doc-editor-link-popover.svelte';
	import DocEditorImageButton from '../docs/doc-editor-image-button.svelte';
	import DocEditorHighlightPopover from '../docs/doc-editor-highlight-popover.svelte';
	import { preventEditorBlur } from '$lib/shared/doc-editor-selection';

	type Props = {
		editor: Editor;
		docId: string;
	};

	type TextAlignOption = 'left' | 'center' | 'right' | 'justify';

	let { editor, docId }: Props = $props();

	const headingLevels = [1, 2, 3, 4, 5, 6] as const;

	const alignOptions: {
		align: TextAlignOption;
		label: string;
		icon: typeof TextAlignLeftIcon;
	}[] = [
		{ align: 'left', label: 'Align left', icon: TextAlignLeftIcon },
		{ align: 'center', label: 'Align center', icon: TextAlignCenterIcon },
		{ align: 'right', label: 'Align right', icon: TextAlignRightIcon },
		{ align: 'justify', label: 'Justify', icon: TextAlignJustifyCenterIcon }
	];

	function run(fn: (ed: Editor) => void) {
		fn(editor);
	}

	function onToolbarMouseDown(e: MouseEvent) {
		const el = e.target as HTMLElement;
		if (el.closest('input, textarea')) return;
		if (
			el.closest('button, [role="button"], .toolbar-icon-btn, .toolbar-select, .highlight-swatch')
		) {
			preventEditorBlur(e);
		}
	}

	function styleLabel(ed: Editor): string {
		for (const level of headingLevels) {
			if (ed.isActive('heading', { level })) return `Heading ${level}`;
		}
		return 'Normal text';
	}

	function currentAlign(ed: Editor): TextAlignOption {
		for (const { align } of alignOptions) {
			if (ed.isActive({ textAlign: align })) return align;
		}
		return 'left';
	}

	function currentAlignIcon(ed: Editor) {
		return alignOptions.find(({ align }) => align === currentAlign(ed))?.icon ?? TextAlignLeftIcon;
	}

	function toolbarIconClass(active: boolean): string {
		return active ? 'toolbar-icon-btn active' : 'toolbar-icon-btn';
	}

	const styleItems = $derived([
		{
			label: 'Normal text',
			plainLabel: true,
			active: !editor.isActive('heading'),
			onclick: () => run((ed) => ed.chain().focus().setParagraph().run())
		},
		...headingLevels.map((level) => ({
			label: `Heading ${level}`,
			plainLabel: true,
			active: editor.isActive('heading', { level }),
			onclick: () => run((ed) => ed.chain().focus().setHeading({ level }).run())
		}))
	]);

	const alignItems = $derived(
		alignOptions.map(({ align, label }) => ({
			label,
			plainLabel: true,
			active: editor.isActive({ textAlign: align }),
			onclick: () => run((ed) => ed.chain().focus().setTextAlign(align).run())
		}))
	);
</script>

<div class="toolbar-scroll border-border border-b">
	<div
		class="toolbar-inner px-2 py-1.5"
		role="toolbar"
		tabindex="-1"
		aria-label="Document formatting"
		onmousedown={onToolbarMouseDown}
	>
		<!-- Undo / redo -->
		<div class="toolbar-group">
			<ButtonUi
				variant="unstyled"
				class="toolbar-icon-btn"
				title="Undo (Ctrl+Z)"
				disabled={!editor.can().undo()}
				onclick={() => run((ed) => ed.chain().focus().undo().run())}
			>
				<HugeiconsIcon
					icon={UndoIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
			<ButtonUi
				variant="unstyled"
				class="toolbar-icon-btn"
				title="Redo (Ctrl+Shift+Z)"
				disabled={!editor.can().redo()}
				onclick={() => run((ed) => ed.chain().focus().redo().run())}
			>
				<HugeiconsIcon
					icon={RedoIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
		</div>

		<span class="toolbar-sep" aria-hidden="true"></span>

		<!-- Styles -->
		<DropdownMenu
			triggerVariant="unstyled"
			items={styleItems}
			triggerClass="toolbar-select text-ink hover:!bg-transparent"
		>
			{#snippet trigger()}
				<span class="toolbar-select-label">{styleLabel(editor)}</span>
				<span class="toolbar-select-chevron" aria-hidden="true">▾</span>
			{/snippet}
		</DropdownMenu>

		<span class="toolbar-sep" aria-hidden="true"></span>

		<!-- Text formatting -->
		<div class="toolbar-group">
			<ButtonUi
				variant="unstyled"
				class={toolbarIconClass(editor.isActive('bold'))}
				title="Bold (Ctrl+B)"
				onclick={() => run((ed) => ed.chain().focus().toggleBold().run())}
			>
				<HugeiconsIcon
					icon={TextBoldIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
			<ButtonUi
				variant="unstyled"
				class={toolbarIconClass(editor.isActive('italic'))}
				title="Italic (Ctrl+I)"
				onclick={() => run((ed) => ed.chain().focus().toggleItalic().run())}
			>
				<HugeiconsIcon
					icon={TextItalicIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
			<ButtonUi
				variant="unstyled"
				class={toolbarIconClass(editor.isActive('underline'))}
				title="Underline (Ctrl+U)"
				onclick={() => run((ed) => ed.chain().focus().toggleUnderline().run())}
			>
				<HugeiconsIcon
					icon={TextUnderlineIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
			<DocEditorHighlightPopover {editor} />
		</div>

		<span class="toolbar-sep" aria-hidden="true"></span>

		<!-- Insert -->
		<div class="toolbar-group">
			<DocEditorLinkPopover {editor} />
			<DocEditorImageButton {editor} {docId} />
		</div>

		<span class="toolbar-sep" aria-hidden="true"></span>

		<!-- Paragraph -->
		<div class="toolbar-group">
			<DropdownMenu
				triggerVariant="unstyled"
				items={alignItems}
				triggerClass="toolbar-select toolbar-select-icon text-ink hover:!bg-transparent"
			>
				{#snippet trigger()}
					<HugeiconsIcon
						icon={currentAlignIcon(editor)}
						size={18}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
					<span class="toolbar-select-chevron" aria-hidden="true">▾</span>
				{/snippet}
			</DropdownMenu>

			<ButtonUi
				variant="unstyled"
				class={toolbarIconClass(editor.isActive('taskList'))}
				title="Checklist"
				onclick={() => run((ed) => ed.chain().focus().toggleTaskList().run())}
			>
				<HugeiconsIcon
					icon={CheckListIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
			<ButtonUi
				variant="unstyled"
				class={toolbarIconClass(editor.isActive('bulletList'))}
				title="Bulleted list"
				onclick={() => run((ed) => ed.chain().focus().toggleBulletList().run())}
			>
				<HugeiconsIcon
					icon={LeftToRightListBulletIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
			<ButtonUi
				variant="unstyled"
				class={toolbarIconClass(editor.isActive('orderedList'))}
				title="Numbered list"
				onclick={() => run((ed) => ed.chain().focus().toggleOrderedList().run())}
			>
				<HugeiconsIcon
					icon={LeftToRightListNumberIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
		</div>

		<span class="toolbar-sep" aria-hidden="true"></span>

		<!-- Extras (not in Google Docs, kept at end) -->
		<div class="toolbar-group">
			<ButtonUi
				variant="unstyled"
				class={toolbarIconClass(editor.isActive('blockquote'))}
				title="Blockquote"
				onclick={() => run((ed) => ed.chain().focus().toggleBlockquote().run())}
			>
				<HugeiconsIcon
					icon={LeftToRightBlockQuoteIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
			<ButtonUi
				variant="unstyled"
				class={toolbarIconClass(editor.isActive('codeBlock'))}
				title="Code block"
				onclick={() => run((ed) => ed.chain().focus().toggleCodeBlock().run())}
			>
				<HugeiconsIcon
					icon={CodeIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
		</div>
	</div>
</div>

<style>
	.toolbar-scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: thin;
		background: var(--color-surface-raised);
	}

	.toolbar-inner {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: 0.0625rem;
		min-width: min-content;
	}

	.toolbar-group {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.0625rem;
	}

	.toolbar-sep {
		flex-shrink: 0;
		width: 1px;
		height: 1.25rem;
		margin: 0 0.25rem;
		background: var(--color-border);
	}

	:global(.doc-editor .toolbar-icon-btn) {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.25rem;
		color: var(--color-ink);
	}

	:global(.doc-editor .toolbar-icon-btn:hover:not(:disabled)) {
		background: color-mix(in srgb, var(--color-border) 55%, var(--color-surface-raised));
	}

	:global(.doc-editor .toolbar-icon-btn.active) {
		background: var(--color-accent-muted);
		color: var(--color-accent);
	}

	:global(.doc-editor .toolbar-icon-btn:disabled) {
		opacity: 0.35;
		cursor: not-allowed;
	}

	:global(.toolbar-select-label) {
		font-size: 0.8125rem;
		font-weight: 500;
		max-width: 7rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.toolbar-select-chevron) {
		font-size: 0.625rem;
		opacity: 0.55;
		line-height: 1;
	}

	:global(.toolbar-select) {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 0.25rem;
		padding: 0.125rem 0.375rem;
		min-height: 1.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-ink);
	}

	:global(.toolbar-select-icon) {
		padding-inline: 0.25rem;
	}

	:global(.toolbar-select:hover) {
		background: color-mix(in srgb, var(--color-border) 55%, var(--color-surface-raised));
	}
</style>
