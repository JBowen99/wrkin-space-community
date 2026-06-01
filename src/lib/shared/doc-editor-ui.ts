/** Lets keyboard shortcuts open Svelte toolbar UI (e.g. link popover). */
let openLinkPopover: (() => void) | null = null;
let openImagePicker: (() => void) | null = null;

export function registerLinkPopoverOpener(fn: () => void): void {
	openLinkPopover = fn;
}

export function unregisterLinkPopoverOpener(fn: () => void): void {
	if (openLinkPopover === fn) openLinkPopover = null;
}

export function requestLinkPopover(): void {
	openLinkPopover?.();
}

export function registerImagePickerOpener(fn: () => void): void {
	openImagePicker = fn;
}

export function unregisterImagePickerOpener(fn: () => void): void {
	if (openImagePicker === fn) openImagePicker = null;
}

export function requestImagePicker(): void {
	openImagePicker?.();
}
