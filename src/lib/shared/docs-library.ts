export type DocsLibrarySort = 'updated' | 'name' | 'type' | 'created';

export const DOCS_LIBRARY_SORTS: DocsLibrarySort[] = ['updated', 'name', 'type', 'created'];

export const DEFAULT_DOCS_LIBRARY_SORT: DocsLibrarySort = 'updated';

export const DOCS_LIBRARY_PER_PAGE = 48;

export type DocsLibraryItemType = 'folder' | 'doc' | 'asset';

export type DocsFolderGrantLevel = 'view' | 'edit';

export function parseDocsLibrarySort(raw: string | null): DocsLibrarySort {
	if (raw && DOCS_LIBRARY_SORTS.includes(raw as DocsLibrarySort)) {
		return raw as DocsLibrarySort;
	}
	return DEFAULT_DOCS_LIBRARY_SORT;
}

export type DocsFolderGrantRow = {
	userId: string;
	level: DocsFolderGrantLevel;
};

export type DocsLibraryFolderRow = {
	id: string;
	name: string;
	/** Custom folder color (hex), or null for default manila. */
	color: string | null;
	position: number;
	updatedAt: Date;
	ownerUserId: string | null;
	isOwner: boolean;
	canEdit: boolean;
	/** True when the current user may open the sharing dialog. */
	canManageSharing: boolean;
	/** True when only listed members can access (not open to whole wrkspace). */
	restricted: boolean;
	grants: DocsFolderGrantRow[];
};

export type DocsLibraryDocRow = {
	id: string;
	title: string;
	previewText: string;
	updatedAt: Date;
	position: number;
	canEdit: boolean;
};

export type DocsLibraryAssetRow = {
	id: string;
	kind: 'upload' | 'link';
	title: string;
	position: number;
	updatedAt: Date;
	mimeType: string | null;
	url: string | null;
	linkImage: string | null;
	siteName: string | null;
	canEdit: boolean;
};

export type DocsLibraryBreadcrumb = {
	id: string | null;
	name: string;
};

/** Flat folder list for the move-to dialog (client builds tree by parentId). */
export type DocsMoveFolderEntry = {
	id: string;
	name: string;
	parentId: string | null;
};

export type DocsMoveFolderTree = {
	canEditRoot: boolean;
	folders: DocsMoveFolderEntry[];
};

export type DocsLibraryListItem =
	| { kind: 'folder'; folder: DocsLibraryFolderRow }
	| { kind: 'doc'; doc: DocsLibraryDocRow }
	| { kind: 'asset'; asset: DocsLibraryAssetRow };

export type DocsLibraryPage = {
	/** Current page entries in sort order (folders, docs, and files interleaved). */
	items: DocsLibraryListItem[];
	folders: DocsLibraryFolderRow[];
	docs: DocsLibraryDocRow[];
	assets: DocsLibraryAssetRow[];
	breadcrumbs: DocsLibraryBreadcrumb[];
	currentFolderId: string | null;
	totalCount: number;
	page: number;
	perPage: number;
	q: string;
	sort: DocsLibrarySort;
	canEditCurrentFolder: boolean;
};

export type DocsLibraryState = {
	folders: DocsLibraryFolderRow[];
	docs: DocsLibraryDocRow[];
	assets: DocsLibraryAssetRow[];
};

export function cloneDocsLibrary(state: DocsLibraryState): DocsLibraryState {
	return {
		folders: state.folders.map((f) => ({ ...f })),
		docs: state.docs.map((d) => ({ ...d })),
		assets: state.assets.map((a) => ({ ...a }))
	};
}

export function moveLibraryItemInState(
	state: DocsLibraryState,
	itemType: DocsLibraryItemType,
	itemId: string,
	targetFolderId: string | null
): DocsLibraryState {
	const next = cloneDocsLibrary(state);
	const remove = <T extends { id: string }>(list: T[], id: string): T | undefined => {
		const index = list.findIndex((x) => x.id === id);
		if (index === -1) return undefined;
		return list.splice(index, 1)[0];
	};

	if (itemType === 'folder') {
		remove(next.folders, itemId);
	} else if (itemType === 'doc') {
		remove(next.docs, itemId);
	} else {
		remove(next.assets, itemId);
	}

	return next;
}
