import { Extension } from '@tiptap/core';
import { requestImagePicker, requestLinkPopover } from './doc-editor-ui';

export const DocEditorShortcuts = Extension.create({
	name: 'docEditorShortcuts',
	addKeyboardShortcuts() {
		return {
			'Mod-k': () => {
				requestLinkPopover();
				return true;
			},
			'Mod-Shift-i': () => {
				requestImagePicker();
				return true;
			}
		};
	}
});
