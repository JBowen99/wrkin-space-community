export const NOTIFICATION_CATEGORIES = [
	'tasks',
	'docs',
	'forum',
	'calendar',
	'cards',
	'chat',
	'wrkspace'
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export function isNotificationCategory(value: string): value is NotificationCategory {
	return NOTIFICATION_CATEGORIES.includes(value as NotificationCategory);
}

export const DEFAULT_CATEGORY_ENABLED: Record<NotificationCategory, boolean> = {
	tasks: true,
	docs: true,
	forum: true,
	calendar: true,
	cards: true,
	chat: false,
	wrkspace: true
};

export const NOTIFICATION_CATEGORY_LABELS: Record<
	NotificationCategory,
	{ label: string; description: string }
> = {
	tasks: {
		label: 'Tasks',
		description: 'Assignments, updates, and completions on tasks you are involved in.'
	},
	docs: {
		label: 'Docs',
		description: 'New documents and significant edits in wrkspaces you belong to.'
	},
	forum: {
		label: 'Forum',
		description: 'New threads and replies in forum modules.'
	},
	calendar: {
		label: 'Calendar',
		description: 'Events added or changed on shared calendars.'
	},
	cards: {
		label: 'Cards',
		description: 'Cards created or moved on shared boards.'
	},
	chat: {
		label: 'Chat',
		description: 'New messages in chat modules. Off by default to reduce noise.'
	},
	wrkspace: {
		label: 'Wrkspace',
		description: 'Modules added and other wrkspace-level changes.'
	}
};

export type ActivityNotifyRule =
	| 'none'
	| 'assignees'
	| 'wrkspace_members'
	| 'mentioned_users';

export const ACTIVITY_TYPES = [
	'task.created',
	'task.updated',
	'task.completed',
	'task.assigned',
	'task.deleted',
	'doc.created',
	'doc.title_changed',
	'doc.edited',
	'module.added'
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function isActivityType(value: string): value is ActivityType {
	return ACTIVITY_TYPES.includes(value as ActivityType);
}

export type ActivityCatalogEntry = {
	category: NotificationCategory;
	notify: ActivityNotifyRule;
};

export const ACTIVITY_CATALOG: Record<ActivityType, ActivityCatalogEntry> = {
	'task.created': { category: 'tasks', notify: 'assignees' },
	'task.updated': { category: 'tasks', notify: 'assignees' },
	'task.completed': { category: 'tasks', notify: 'assignees' },
	'task.assigned': { category: 'tasks', notify: 'mentioned_users' },
	'task.deleted': { category: 'tasks', notify: 'assignees' },
	'doc.created': { category: 'docs', notify: 'wrkspace_members' },
	'doc.title_changed': { category: 'docs', notify: 'none' },
	'doc.edited': { category: 'docs', notify: 'none' },
	'module.added': { category: 'wrkspace', notify: 'wrkspace_members' }
};

export type ActivityTargetType = 'task' | 'doc' | 'module';

export type ActivityMetadata = {
	title?: string;
	moduleTitle?: string;
	moduleType?: string;
	assigneeIds?: string[];
	mentionedUserIds?: string[];
	previousTitle?: string;
	changes?: string[];
};

export type ActivityEventInput = {
	wrkspaceId: string;
	actorUserId: string;
	type: ActivityType;
	moduleId?: string | null;
	moduleType?: string | null;
	targetType: ActivityTargetType;
	targetId: string;
	metadata?: ActivityMetadata;
};
