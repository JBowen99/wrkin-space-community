import { generateText } from '@tiptap/core';
import { Tiptap } from '@hocuspocus/transformer';
import * as Y from 'yjs';
import {
	DOC_COLLAB_FIELD,
	docEditorExtensions,
	parseDocIdFromDocumentName,
	hocuspocusDocumentName
} from '$lib/shared/doc-editor';

export { DOC_COLLAB_FIELD, parseDocIdFromDocumentName, hocuspocusDocumentName };

const transformer = new Tiptap().extensions(docEditorExtensions);

const PREVIEW_MAX = 400;

export function truncatePreviewText(text: string): string {
	const normalized = text.replace(/\s+/g, ' ').trim();
	if (normalized.length <= PREVIEW_MAX) return normalized;
	const slice = normalized.slice(0, PREVIEW_MAX);
	const lastSpace = slice.lastIndexOf(' ');
	return (lastSpace > PREVIEW_MAX * 0.6 ? slice.slice(0, lastSpace) : slice) + '…';
}

export function extractPreviewText(state: Uint8Array): string {
	if (!state.length) return '';
	const ydoc = new Y.Doc();
	Y.applyUpdate(ydoc, state);
	try {
		const json = transformer.fromYdoc(ydoc, DOC_COLLAB_FIELD);
		const text = generateText(json, docEditorExtensions);
		return truncatePreviewText(text);
	} catch {
		return '';
	}
}
