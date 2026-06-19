export type BookmarkTargetType =
	| 'chatMessage'
	| 'forumThread'
	| 'forumPost'
	| 'taskItem'
	| 'boardCard'
	| 'docPage'
	| 'docAsset'
	| 'calendarEvent'
	| 'reportInstance';

export type BookmarkRow = {
	id: string;
	userId: string;
	teamSlug: string;
	wrkspaceId: string;
	wrkspaceName: string;
	wrkspaceSlug: string;
	moduleId: string | null;
	moduleType: string;
	targetType: BookmarkTargetType;
	targetId: string;
	contextId: string | null;
	label: string;
	createdAt: string;
};

export function buildBookmarkHref(bookmark: BookmarkRow): string {
	const base = `/teams/${bookmark.teamSlug}/wrkspaces/${bookmark.wrkspaceSlug}/modules/${bookmark.moduleId}`;

	switch (bookmark.targetType) {
		case 'chatMessage':
			return `${base}?highlightMessage=${bookmark.targetId}`;
		case 'forumThread':
			return `${base}/threads/${bookmark.targetId}`;
		case 'forumPost':
			return `${base}/threads/${bookmark.contextId ?? bookmark.targetId}#post-${bookmark.targetId}`;
		case 'taskItem':
			return `${base}?task=${bookmark.targetId}`;
		case 'boardCard':
			return `${base}?cardId=${bookmark.targetId}`;
		case 'docPage':
			return `${base}/docs/${bookmark.targetId}`;
		case 'docAsset':
			return `${base}/assets/${bookmark.targetId}`;
		case 'calendarEvent':
			return `${base}/events/${bookmark.targetId}`;
		case 'reportInstance':
			return `${base}/reports/${bookmark.targetId}`;
		default:
			return base;
	}
}
