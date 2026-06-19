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
	import ButtonUi from '../ui/button.svelte';
	import DropdownMenu from '../ui/dropdown-menu.svelte';
	import { preventEditorBlur } from '$lib/shared/doc-editor-selection';

	type Props = {
		editor: Editor;
	};

	type TextAlignOption = 'left' | 'center' | 'right' | 'justify';

	let { editor }: Props = $props();

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
		if (el.closest('button, [role="button"], .note-toolbar-btn')) {
			preventEditorBlur(e);
		}
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

	function btnClass(active: boolean): string {
		return active ? 'note-toolbar-btn active' : 'note-toolbar-btn';
	}

	const alignItems = $derived(
		alignOptions.map(({ align, label }) => ({
			label,
			plainLabel: true,
			active: editor.isActive({ textAlign: align }),
			onclick: () => run((ed) => ed.chain().focus().setTextAlign(align).run())
		}))
	);
</script>

<div class="note-toolbar-scroll border-border border-t">
	<div
		class="note-toolbar-inner px-2 py-1.5"
		role="toolbar"
		tabindex="-1"
		aria-label="Note formatting"
		onmousedown={onToolbarMouseDown}
	>
		<div class="note-toolbar-group">
			<ButtonUi
				variant="unstyled"
				class="note-toolbar-btn"
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
				class="note-toolbar-btn"
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

		<span class="note-toolbar-sep" aria-hidden="true"></span>

		<div class="note-toolbar-group">
			<ButtonUi
				variant="unstyled"
				class={btnClass(editor.isActive('bold'))}
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
				class={btnClass(editor.isActive('italic'))}
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
				class={btnClass(editor.isActive('underline'))}
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
		</div>

		<span class="note-toolbar-sep" aria-hidden="true"></span>

		<div class="note-toolbar-group">
			<DropdownMenu
				triggerVariant="unstyled"
				items={alignItems}
				triggerClass="note-toolbar-select note-toolbar-select-icon text-ink hover:!bg-transparent"
			>
				{#snippet trigger()}
					<HugeiconsIcon
						icon={currentAlignIcon(editor)}
						size={18}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
					<span class="note-toolbar-select-chevron" aria-hidden="true">▾</span>
				{/snippet}
			</DropdownMenu>

			<ButtonUi
				variant="unstyled"
				class={btnClass(editor.isActive('taskList'))}
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
				class={btnClass(editor.isActive('bulletList'))}
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
				class={btnClass(editor.isActive('orderedList'))}
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

		<span class="note-toolbar-sep" aria-hidden="true"></span>

		<div class="note-toolbar-group">
			<ButtonUi
				variant="unstyled"
				class={btnClass(editor.isActive('blockquote'))}
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
				class={btnClass(editor.isActive('codeBlock'))}
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
	.note-toolbar-scroll {
		overflow: hidden;
		background: var(--color-surface-raised);
	}

	.note-toolbar-inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.125rem;
	}

	.note-toolbar-group {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.125rem;
	}

	.note-toolbar-sep {
		flex-shrink: 0;
		width: 1px;
		height: 1.125rem;
		margin: 0 0.125rem;
		background: var(--color-border);
	}

	:global(.note-toolbar-btn) {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.25rem;
		color: var(--color-ink);
	}

	:global(.note-toolbar-btn:hover:not(:disabled)) {
		background: color-mix(in srgb, var(--color-border) 55%, var(--color-surface-raised));
	}

	:global(.note-toolbar-btn.active) {
		background: var(--color-accent-muted);
		color: var(--color-accent);
	}

	:global(.note-toolbar-btn:disabled) {
		opacity: 0.35;
		cursor: not-allowed;
	}

	:global(.note-toolbar-select-label) {
		font-size: 0.75rem;
		font-weight: 500;
		max-width: 5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.note-toolbar-select-chevron) {
		font-size: 0.5625rem;
		opacity: 0.55;
		line-height: 1;
	}

	:global(.note-toolbar-select) {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 0.25rem;
		padding: 0.0625rem 0.375rem;
		min-height: 1.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-ink);
	}

	:global(.note-toolbar-select-icon) {
		padding-inline: 0.25rem;
	}

	:global(.note-toolbar-select:hover) {
		background: color-mix(in srgb, var(--color-border) 55%, var(--color-surface-raised));
	}
</style>
