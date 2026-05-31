import type { Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import { Selection, TrailingNode } from '@tiptap/extensions';
import { DocEditorShortcuts } from './doc-editor-shortcuts';

export const DOC_COLLAB_FIELD = 'default';

export const docEditorExtensions: Extensions = [
	StarterKit.configure({
		undoRedo: false,
		heading: {
			levels: [1, 2, 3, 4, 5, 6]
		}
	}),
	Underline,
	Link.configure({
		openOnClick: false,
		autolink: true,
		linkOnPaste: true,
		HTMLAttributes: {
			rel: 'noopener noreferrer',
			target: '_blank'
		}
	}),
	TextAlign.configure({
		types: ['heading', 'paragraph']
	}),
	TaskList,
	TaskItem.configure({ nested: true }),
	Image.configure({ inline: false, allowBase64: false }),
	Highlight.configure({ multicolor: true }),
	Selection.configure({ className: 'doc-editor-selection' }),
	TrailingNode,
	DocEditorShortcuts
];

export const DOC_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const DOC_IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

export function normalizeLinkUrl(url: string): string {
	const trimmed = url.trim();
	if (!trimmed) return '';
	if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
	return `https://${trimmed}`;
}

export function hocuspocusDocumentName(docId: string): string {
	return `doc.${docId}`;
}

export function parseDocIdFromDocumentName(name: string): string | null {
	// Hocuspocus v4 may append \0sessionId when sessionAwareness is enabled.
	const baseName = name.split('\0')[0] ?? name;
	if (!baseName.startsWith('doc.')) return null;
	const docId = baseName.slice(4);
	return docId || null;
}
