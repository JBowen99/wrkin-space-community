import type { Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { Selection, TrailingNode } from '@tiptap/extensions';

export const noteEditorExtensions: Extensions = [
	StarterKit.configure({
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
	Highlight.configure({ multicolor: true }),
	Selection.configure({ className: 'doc-editor-selection' }),
	TrailingNode
];
