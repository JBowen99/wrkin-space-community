import { browser } from '$app/environment';
import { closestCenter, cursorOver, type CollisionAlgorithm } from '@horuse/svelte-dnd';

/** True when the pointer is over a folder drop target (not the sortable grid). */
export function isPointerOverFolderDropZone(pointer: { x: number; y: number }): boolean {
	if (!browser) return false;
	const el = document.elementFromPoint(pointer.x, pointer.y);
	return el?.closest('[data-dnd-drop-id^="folder-"]') != null;
}

/** Grid sortable collision — defer to folder `target()` containers when over a folder tile. */
export const libraryGridCollision: CollisionAlgorithm = (ctx) => {
	if (isPointerOverFolderDropZone(ctx.pointer)) return null;
	return closestCenter(ctx);
};

export { cursorOver };
