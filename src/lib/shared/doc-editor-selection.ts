import type { Editor } from '@tiptap/core';

export type EditorSelectionRange = { from: number; to: number };

/** Keep the editor selection when clicking toolbar controls. */
export function preventEditorBlur(e: MouseEvent): void {
	e.preventDefault();
}

export function captureSelection(editor: Editor): EditorSelectionRange {
	const { from, to } = editor.state.selection;
	return { from, to };
}

export function hasRangeSelection(range: EditorSelectionRange): boolean {
	return range.from !== range.to;
}
