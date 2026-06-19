import type { ActivityMetadata, ActivityType } from './activity';

export type ActivityRenderContext = {
	teamSlug: string;
	wrkspaceSlug: string;
	moduleId?: string | null;
};

export type ActivityEventDisplay = {
	id: string;
	type: ActivityType;
	actorUserId: string;
	actorName: string;
	actorImage: string | null;
	targetType: string;
	targetId: string;
	metadata: ActivityMetadata;
	moduleId: string | null;
	moduleType: string | null;
	createdAt: Date;
};

export type FormattedActivity = {
	summary: string;
	highlight?: string;
	href: string | null;
};

function metadataTitle(metadata: ActivityMetadata, fallback = 'Untitled'): string {
	const title = metadata.title?.trim();
	return title || fallback;
}

export function buildActivityHref(
	event: Pick<ActivityEventDisplay, 'type' | 'targetType' | 'targetId' | 'moduleId'>,
	ctx: ActivityRenderContext
): string | null {
	const base = `/teams/${ctx.teamSlug}/wrkspaces/${ctx.wrkspaceSlug}`;
	const moduleId = event.moduleId ?? ctx.moduleId;
	if (!moduleId) return `${base}/activity`;

	if (event.targetType === 'task' || event.type.startsWith('task.')) {
		return `${base}/modules/${moduleId}?task=${event.targetId}`;
	}
	if (event.targetType === 'doc' || event.type.startsWith('doc.')) {
		return `${base}/modules/${moduleId}/docs/${event.targetId}`;
	}
	if (event.targetType === 'module' || event.type === 'module.added') {
		return `${base}/modules/${event.targetId}`;
	}
	if (event.targetType === 'decision' || event.type.startsWith('decision.')) {
		return `${base}/modules/${moduleId}/decisions/${event.targetId}`;
	}
	if (event.targetType === 'card' || event.type.startsWith('card.')) {
		return `${base}/modules/${moduleId}`;
	}
	return `${base}/modules/${moduleId}`;
}

export function formatActivitySummary(
	event: ActivityEventDisplay,
	ctx: ActivityRenderContext
): FormattedActivity {
	const actor = event.actorName;
	const title = metadataTitle(event.metadata);
	const href = buildActivityHref(event, ctx);

	switch (event.type) {
		case 'task.created':
			return { summary: `${actor} created task`, highlight: title, href };
		case 'task.updated':
			return { summary: `${actor} updated task`, highlight: title, href };
		case 'task.completed':
			return { summary: `${actor} completed task`, highlight: title, href };
		case 'task.assigned':
			return { summary: `${actor} assigned you to`, highlight: title, href };
		case 'task.deleted':
			return { summary: `${actor} deleted task`, highlight: title, href };
		case 'task.commented':
			return { summary: `${actor} commented on task`, highlight: title, href };
		case 'doc.created':
			return { summary: `${actor} created document`, highlight: title, href };
		case 'doc.title_changed': {
			const prev = event.metadata.previousTitle?.trim();
			if (prev && prev !== title) {
				return {
					summary: `${actor} renamed document from "${prev}" to`,
					highlight: title,
					href
				};
			}
			return { summary: `${actor} renamed document to`, highlight: title, href };
		}
		case 'doc.edited':
			return { summary: `${actor} edited document`, highlight: title, href };
		case 'doc.folder_created':
			return { summary: `${actor} created folder`, highlight: title, href };
		case 'doc.asset_uploaded':
			return { summary: `${actor} uploaded file`, highlight: title, href };
		case 'doc.asset_linked':
			return { summary: `${actor} added link`, highlight: title, href };
		case 'doc.item_moved':
			return { summary: `${actor} moved an item`, highlight: title, href };
		case 'doc.folder_shared':
			return { summary: `${actor} updated folder sharing`, highlight: title, href };
		case 'module.added': {
			const moduleTitle = event.metadata.moduleTitle ?? event.metadata.title ?? 'Module';
			return { summary: `${actor} added module`, highlight: moduleTitle, href };
		}
		case 'decision.created':
			return { summary: `${actor} recorded decision`, highlight: title, href };
		case 'decision.updated':
			return { summary: `${actor} updated decision`, highlight: title, href };
		case 'decision.status_changed':
			return { summary: `${actor} changed decision status for`, highlight: title, href };
		case 'decision.deleted':
			return { summary: `${actor} deleted decision`, highlight: title, href };
		case 'card.created': {
			const cardTitle = event.metadata.cardTitle ?? title;
			const columnTitle = event.metadata.columnTitle?.trim();
			return {
				summary: columnTitle ? `${actor} added card to ${columnTitle}` : `${actor} added card`,
				highlight: cardTitle,
				href
			};
		}
		case 'card.updated': {
			const cardTitle = event.metadata.cardTitle ?? title;
			return { summary: `${actor} updated card`, highlight: cardTitle, href };
		}
		case 'card.moved': {
			const cardTitle = event.metadata.cardTitle ?? title;
			const fromColumn = event.metadata.fromColumn?.trim();
			const toColumn = event.metadata.toColumn?.trim();
			if (fromColumn && toColumn) {
				return {
					summary: `${actor} moved card from ${fromColumn} to ${toColumn}`,
					highlight: cardTitle,
					href
				};
			}
			return { summary: `${actor} moved card`, highlight: cardTitle, href };
		}
		case 'card.deleted': {
			const cardTitle = event.metadata.cardTitle ?? title;
			return { summary: `${actor} deleted card`, highlight: cardTitle, href };
		}
		case 'card.schema_updated':
			return { summary: `${actor} updated card fields for this board`, highlight: title, href };
		case 'card.board_configured': {
			const presetName = event.metadata.title ?? 'board preset';
			return { summary: `${actor} set up this board`, highlight: presetName, href };
		}
		default:
			return { summary: `${actor} made a change`, highlight: title, href };
	}
}

export function formatNotificationSummary(
	event: ActivityEventDisplay,
	ctx: ActivityRenderContext
): FormattedActivity {
	return formatActivitySummary(event, ctx);
}

export function formatRelativeTime(date: Date, now = new Date()): string {
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	if (diffSec < 60) return 'just now';
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHour = Math.floor(diffMin / 60);
	if (diffHour < 24) return `${diffHour}h ago`;
	const diffDay = Math.floor(diffHour / 24);
	if (diffDay < 7) return `${diffDay}d ago`;
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
