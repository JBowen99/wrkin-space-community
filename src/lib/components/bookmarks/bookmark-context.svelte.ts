import { setContext, getContext } from 'svelte';

const BOOKMARK_KEY = Symbol('bookmark');

export class BookmarkContext {
	bookmarkedIds = $state<string[]>([]);
	teamSlug = $state('');
	wrkspaceSlug = $state('');
	moduleId = $state('');
	moduleType = $state('');

	isBookmarked(targetId: string): boolean {
		return this.bookmarkedIds.includes(targetId);
	}
}

export function setBookmarkContext(init: {
	bookmarkedIds?: string[];
	teamSlug?: string;
	wrkspaceSlug?: string;
	moduleId?: string;
	moduleType?: string;
}) {
	const ctx = new BookmarkContext();
	ctx.bookmarkedIds = init.bookmarkedIds ?? [];
	ctx.teamSlug = init.teamSlug ?? '';
	ctx.wrkspaceSlug = init.wrkspaceSlug ?? '';
	ctx.moduleId = init.moduleId ?? '';
	ctx.moduleType = init.moduleType ?? '';
	return setContext<BookmarkContext>(BOOKMARK_KEY, ctx);
}

export function getBookmarkContext(): BookmarkContext | null {
	return getContext<BookmarkContext | null>(BOOKMARK_KEY) ?? null;
}
