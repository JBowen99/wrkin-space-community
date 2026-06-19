export const NOTIFICATION_CATEGORIES = [
	'tasks',
	'docs',
	'forum',
	'calendar',
	'cards',
	'chat',
	'okrs',
	'decisions',
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
	okrs: true,
	decisions: true,
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
	okrs: {
		label: 'OKRs',
		description: 'Progress updates and changes on objectives and key results.'
	},
	decisions: {
		label: 'Decisions',
		description: 'New decisions and updates to decision records in your wrkspaces.'
	},
	wrkspace: {
		label: 'Wrkspace',
		description: 'Modules added and other wrkspace-level changes.'
	}
};

export type ActivityNotifyRule = 'none' | 'assignees' | 'wrkspace_members' | 'mentioned_users';

export const ACTIVITY_TYPES = [
	'task.created',
	'task.updated',
	'task.completed',
	'task.assigned',
	'task.deleted',
	'task.commented',
	'doc.created',
	'doc.title_changed',
	'doc.edited',
	'doc.folder_created',
	'doc.asset_uploaded',
	'doc.asset_linked',
	'doc.item_moved',
	'doc.folder_shared',
	'module.added',
	'okr_cycle.created',
	'okr_objective.created',
	'okr_objective.status_changed',
	'okr_key_result.created',
	'okr_key_result.checked_in',
	'decision.created',
	'decision.updated',
	'decision.status_changed',
	'decision.deleted',
	'card.created',
	'card.updated',
	'card.moved',
	'card.deleted',
	'card.schema_updated',
	'card.board_configured'
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
	'task.commented': { category: 'tasks', notify: 'assignees' },
	'doc.created': { category: 'docs', notify: 'wrkspace_members' },
	'doc.title_changed': { category: 'docs', notify: 'none' },
	'doc.edited': { category: 'docs', notify: 'none' },
	'doc.folder_created': { category: 'docs', notify: 'wrkspace_members' },
	'doc.asset_uploaded': { category: 'docs', notify: 'wrkspace_members' },
	'doc.asset_linked': { category: 'docs', notify: 'wrkspace_members' },
	'doc.item_moved': { category: 'docs', notify: 'none' },
	'doc.folder_shared': { category: 'docs', notify: 'none' },
	'module.added': { category: 'wrkspace', notify: 'wrkspace_members' },
	'okr_cycle.created': { category: 'okrs', notify: 'wrkspace_members' },
	'okr_objective.created': { category: 'okrs', notify: 'wrkspace_members' },
	'okr_objective.status_changed': { category: 'okrs', notify: 'wrkspace_members' },
	'okr_key_result.created': { category: 'okrs', notify: 'wrkspace_members' },
	'okr_key_result.checked_in': { category: 'okrs', notify: 'wrkspace_members' },
	'decision.created': { category: 'decisions', notify: 'wrkspace_members' },
	'decision.updated': { category: 'decisions', notify: 'wrkspace_members' },
	'decision.status_changed': { category: 'decisions', notify: 'wrkspace_members' },
	'decision.deleted': { category: 'decisions', notify: 'wrkspace_members' },
	'card.created': { category: 'cards', notify: 'wrkspace_members' },
	'card.updated': { category: 'cards', notify: 'wrkspace_members' },
	'card.moved': { category: 'cards', notify: 'wrkspace_members' },
	'card.deleted': { category: 'cards', notify: 'wrkspace_members' },
	'card.schema_updated': { category: 'cards', notify: 'wrkspace_members' },
	'card.board_configured': { category: 'cards', notify: 'wrkspace_members' }
};

export type ActivityTargetType =
	| 'task'
	| 'doc'
	| 'module'
	| 'card'
	| 'okr_cycle'
	| 'okr_objective'
	| 'okr_key_result'
	| 'decision';

export type CardActivityChange = {
	label: string;
	from: string;
	to: string;
};

export type ActivityMetadata = {
	title?: string;
	moduleTitle?: string;
	moduleType?: string;
	assigneeIds?: string[];
	mentionedUserIds?: string[];
	previousTitle?: string;
	changes?: string[] | CardActivityChange[];
	cardTitle?: string;
	columnTitle?: string;
	fromColumn?: string;
	toColumn?: string;
	fieldCount?: number;
	primaryField?: string;
	templateId?: string;
	includeSampleContent?: boolean;
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
