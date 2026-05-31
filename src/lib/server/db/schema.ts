import { relations } from 'drizzle-orm';
import {
	boolean,
	customType,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

/** Postgres bytea via postgres.js — pass Buffers, not hex strings. */
const byteaColumn = customType<{ data: Uint8Array; driverData: Buffer }>({
	dataType() {
		return 'bytea';
	},
	toDriver(value: Uint8Array) {
		return Buffer.from(value);
	},
	fromDriver(value: unknown): Uint8Array {
		if (Buffer.isBuffer(value)) {
			return new Uint8Array(value);
		}
		if (value instanceof Uint8Array) {
			return value;
		}
		if (typeof value === 'string') {
			const hex = value.startsWith('\\x') ? value.slice(2) : value;
			return new Uint8Array(Buffer.from(hex, 'hex'));
		}
		throw new Error(`Unexpected bytea value: ${typeof value}`);
	}
});
import { user } from './auth.schema';

export const team = pgTable('team', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	subscriptionTier: text('subscription_tier').notNull().default('personal'),
	extraMemberSeats: integer('extra_member_seats').notNull().default(0),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const teamMember = pgTable(
	'team_member',
	{
		teamId: text('team_id')
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('user'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('team_member_team_user_idx').on(table.teamId, table.userId),
		index('team_member_user_idx').on(table.userId)
	]
);

export const teamInvite = pgTable(
	'team_invite',
	{
		id: text('id').primaryKey(),
		teamId: text('team_id')
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		role: text('role').notNull().default('user'),
		tokenHash: text('token_hash').notNull().unique(),
		invitedById: text('invited_by_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at').notNull(),
		acceptedAt: timestamp('accepted_at'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('team_invite_team_idx').on(table.teamId),
		index('team_invite_email_idx').on(table.email)
	]
);

export const wrkspace = pgTable(
	'wrkspace',
	{
		id: text('id').primaryKey(),
		teamId: text('team_id')
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description').notNull().default(''),
		slug: text('slug').notNull(),
		createdById: text('created_by_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [uniqueIndex('wrkspace_team_slug_idx').on(table.teamId, table.slug)]
);

export const wrkspaceMember = pgTable(
	'wrkspace_member',
	{
		wrkspaceId: text('wrkspace_id')
			.notNull()
			.references(() => wrkspace.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('user'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('wrkspace_member_wrkspace_user_idx').on(table.wrkspaceId, table.userId),
		index('wrkspace_member_user_idx').on(table.userId)
	]
);

export const wrkspaceModule = pgTable(
	'wrkspace_module',
	{
		id: text('id').primaryKey(),
		wrkspaceId: text('wrkspace_id')
			.notNull()
			.references(() => wrkspace.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		title: text('title').notNull(),
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('wrkspace_module_wrkspace_idx').on(table.wrkspaceId)]
);

export const chatMessage = pgTable(
	'chat_message',
	{
		id: text('id').primaryKey(),
		moduleId: text('module_id')
			.notNull()
			.references(() => wrkspaceModule.id, { onDelete: 'cascade' }),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('chat_message_module_idx').on(table.moduleId)]
);

export const chatMessageReaction = pgTable(
	'chat_message_reaction',
	{
		id: text('id').primaryKey(),
		messageId: text('message_id')
			.notNull()
			.references(() => chatMessage.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		emoji: text('emoji').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('chat_message_reaction_unique_idx').on(table.messageId, table.userId, table.emoji),
		index('chat_message_reaction_message_idx').on(table.messageId)
	]
);

export const chatMessageAttachment = pgTable(
	'chat_message_attachment',
	{
		id: text('id').primaryKey(),
		messageId: text('message_id')
			.notNull()
			.references(() => chatMessage.id, { onDelete: 'cascade' }),
		storageKey: text('storage_key').notNull().unique(),
		originalName: text('original_name').notNull(),
		mimeType: text('mime_type').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('chat_message_attachment_message_idx').on(table.messageId)]
);

export const calendarEvent = pgTable(
	'calendar_event',
	{
		id: text('id').primaryKey(),
		moduleId: text('module_id')
			.notNull()
			.references(() => wrkspaceModule.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description').notNull().default(''),
		icalUid: text('ical_uid'),
		startsAt: timestamp('starts_at').notNull(),
		endsAt: timestamp('ends_at'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('calendar_event_module_idx').on(table.moduleId),
		uniqueIndex('calendar_event_module_ical_uid_idx').on(table.moduleId, table.icalUid)
	]
);

export const cardColumn = pgTable(
	'card_column',
	{
		id: text('id').primaryKey(),
		moduleId: text('module_id')
			.notNull()
			.references(() => wrkspaceModule.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		color: text('color').notNull().default('#a8a29e'),
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('card_column_module_idx').on(table.moduleId)]
);

export const forumThread = pgTable(
	'forum_thread',
	{
		id: text('id').primaryKey(),
		moduleId: text('module_id')
			.notNull()
			.references(() => wrkspaceModule.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		closedAt: timestamp('closed_at')
	},
	(table) => [index('forum_thread_module_idx').on(table.moduleId)]
);

export const forumPost = pgTable(
	'forum_post',
	{
		id: text('id').primaryKey(),
		threadId: text('thread_id')
			.notNull()
			.references(() => forumThread.id, { onDelete: 'cascade' }),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		parentId: text('parent_id'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('forum_post_thread_idx').on(table.threadId),
		index('forum_post_parent_idx').on(table.parentId),
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: 'forum_post_parent_id_forum_post_id_fk'
		}).onDelete('cascade')
	]
);

export const forumPostAttachment = pgTable(
	'forum_post_attachment',
	{
		id: text('id').primaryKey(),
		postId: text('post_id')
			.notNull()
			.references(() => forumPost.id, { onDelete: 'cascade' }),
		storageKey: text('storage_key').notNull().unique(),
		originalName: text('original_name').notNull(),
		mimeType: text('mime_type').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('forum_post_attachment_post_idx').on(table.postId)]
);

export const docPage = pgTable(
	'doc_page',
	{
		id: text('id').primaryKey(),
		moduleId: text('module_id')
			.notNull()
			.references(() => wrkspaceModule.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		position: integer('position').notNull().default(0),
		yjsState: byteaColumn('yjs_state'),
		previewText: text('preview_text').notNull().default(''),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [index('doc_page_module_idx').on(table.moduleId)]
);

export const boardCard = pgTable(
	'board_card',
	{
		id: text('id').primaryKey(),
		columnId: text('column_id')
			.notNull()
			.references(() => cardColumn.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		body: text('body').notNull().default(''),
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('board_card_column_idx').on(table.columnId)]
);

export const taskItem = pgTable(
	'task_item',
	{
		id: text('id').primaryKey(),
		moduleId: text('module_id')
			.notNull()
			.references(() => wrkspaceModule.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description').notNull().default(''),
		notes: text('notes').notNull().default(''),
		status: text('status').notNull().default('todo'),
		priority: text('priority').notNull().default('medium'),
		startsAt: timestamp('starts_at'),
		dueAt: timestamp('due_at'),
		completedAt: timestamp('completed_at'),
		position: integer('position').notNull().default(0),
		percentDone: integer('percent_done').notNull().default(0),
		customColor: text('custom_color'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [index('task_item_module_idx').on(table.moduleId)]
);

export const taskDependency = pgTable(
	'task_dependency',
	{
		id: text('id').primaryKey(),
		fromTaskId: text('from_task_id')
			.notNull()
			.references(() => taskItem.id, { onDelete: 'cascade' }),
		toTaskId: text('to_task_id')
			.notNull()
			.references(() => taskItem.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('task_dependency_from_to_idx').on(table.fromTaskId, table.toTaskId),
		index('task_dependency_to_idx').on(table.toTaskId)
	]
);

export const taskModuleSettings = pgTable('task_module_settings', {
	moduleId: text('module_id')
		.primaryKey()
		.references(() => wrkspaceModule.id, { onDelete: 'cascade' }),
	colorBy: text('color_by').notNull().default('priority'),
	statusColors: text('status_colors').notNull(),
	priorityColors: text('priority_colors').notNull()
});

export const taskAssignee = pgTable(
	'task_assignee',
	{
		taskId: text('task_id')
			.notNull()
			.references(() => taskItem.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('task_assignee_task_user_idx').on(table.taskId, table.userId),
		index('task_assignee_task_idx').on(table.taskId),
		index('task_assignee_user_idx').on(table.userId)
	]
);

export const taskAttachment = pgTable(
	'task_attachment',
	{
		id: text('id').primaryKey(),
		taskId: text('task_id')
			.notNull()
			.references(() => taskItem.id, { onDelete: 'cascade' }),
		storageKey: text('storage_key').notNull().unique(),
		originalName: text('original_name').notNull(),
		mimeType: text('mime_type').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		uploadedBy: text('uploaded_by')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('task_attachment_task_idx').on(table.taskId)]
);

export const activityEvent = pgTable(
	'activity_event',
	{
		id: text('id').primaryKey(),
		wrkspaceId: text('wrkspace_id')
			.notNull()
			.references(() => wrkspace.id, { onDelete: 'cascade' }),
		actorUserId: text('actor_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		moduleId: text('module_id').references(() => wrkspaceModule.id, { onDelete: 'set null' }),
		moduleType: text('module_type'),
		targetType: text('target_type').notNull(),
		targetId: text('target_id').notNull(),
		metadata: text('metadata').notNull().default('{}'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('activity_event_wrkspace_created_idx').on(table.wrkspaceId, table.createdAt),
		index('activity_event_actor_idx').on(table.actorUserId)
	]
);

export const notification = pgTable(
	'notification',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		activityEventId: text('activity_event_id')
			.notNull()
			.references(() => activityEvent.id, { onDelete: 'cascade' }),
		readAt: timestamp('read_at'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('notification_user_read_created_idx').on(table.userId, table.readAt, table.createdAt),
		uniqueIndex('notification_user_event_idx').on(table.userId, table.activityEventId)
	]
);

export const userNotificationPreference = pgTable(
	'user_notification_preference',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		category: text('category').notNull(),
		enabled: boolean('enabled').notNull().default(true),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('user_notification_preference_user_category_idx').on(table.userId, table.category)
	]
);

export const teamRelations = relations(team, ({ many }) => ({
	members: many(teamMember),
	invites: many(teamInvite),
	wrkspaces: many(wrkspace)
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
	team: one(team, { fields: [teamMember.teamId], references: [team.id] }),
	user: one(user, { fields: [teamMember.userId], references: [user.id] })
}));

export const teamInviteRelations = relations(teamInvite, ({ one }) => ({
	team: one(team, { fields: [teamInvite.teamId], references: [team.id] }),
	invitedBy: one(user, { fields: [teamInvite.invitedById], references: [user.id] })
}));

export const wrkspaceRelations = relations(wrkspace, ({ one, many }) => ({
	team: one(team, { fields: [wrkspace.teamId], references: [team.id] }),
	members: many(wrkspaceMember),
	modules: many(wrkspaceModule),
	activityEvents: many(activityEvent)
}));

export const wrkspaceMemberRelations = relations(wrkspaceMember, ({ one }) => ({
	wrkspace: one(wrkspace, { fields: [wrkspaceMember.wrkspaceId], references: [wrkspace.id] }),
	user: one(user, { fields: [wrkspaceMember.userId], references: [user.id] })
}));

export const wrkspaceModuleRelations = relations(wrkspaceModule, ({ one, many }) => ({
	wrkspace: one(wrkspace, { fields: [wrkspaceModule.wrkspaceId], references: [wrkspace.id] }),
	chatMessages: many(chatMessage),
	calendarEvents: many(calendarEvent),
	cardColumns: many(cardColumn),
	docPages: many(docPage),
	forumThreads: many(forumThread),
	taskItems: many(taskItem),
	taskModuleSettings: one(taskModuleSettings, {
		fields: [wrkspaceModule.id],
		references: [taskModuleSettings.moduleId]
	})
}));

export const forumThreadRelations = relations(forumThread, ({ one, many }) => ({
	module: one(wrkspaceModule, { fields: [forumThread.moduleId], references: [wrkspaceModule.id] }),
	author: one(user, { fields: [forumThread.authorId], references: [user.id] }),
	posts: many(forumPost)
}));

export const forumPostRelations = relations(forumPost, ({ one, many }) => ({
	thread: one(forumThread, { fields: [forumPost.threadId], references: [forumThread.id] }),
	author: one(user, { fields: [forumPost.authorId], references: [user.id] }),
	parent: one(forumPost, { fields: [forumPost.parentId], references: [forumPost.id] }),
	attachments: many(forumPostAttachment)
}));

export const forumPostAttachmentRelations = relations(forumPostAttachment, ({ one }) => ({
	post: one(forumPost, {
		fields: [forumPostAttachment.postId],
		references: [forumPost.id]
	})
}));

export const chatMessageRelations = relations(chatMessage, ({ one, many }) => ({
	module: one(wrkspaceModule, { fields: [chatMessage.moduleId], references: [wrkspaceModule.id] }),
	author: one(user, { fields: [chatMessage.authorId], references: [user.id] }),
	reactions: many(chatMessageReaction),
	attachments: many(chatMessageAttachment)
}));

export const chatMessageAttachmentRelations = relations(chatMessageAttachment, ({ one }) => ({
	message: one(chatMessage, {
		fields: [chatMessageAttachment.messageId],
		references: [chatMessage.id]
	})
}));

export const chatMessageReactionRelations = relations(chatMessageReaction, ({ one }) => ({
	message: one(chatMessage, {
		fields: [chatMessageReaction.messageId],
		references: [chatMessage.id]
	}),
	user: one(user, { fields: [chatMessageReaction.userId], references: [user.id] })
}));

export const calendarEventRelations = relations(calendarEvent, ({ one }) => ({
	module: one(wrkspaceModule, {
		fields: [calendarEvent.moduleId],
		references: [wrkspaceModule.id]
	})
}));

export const cardColumnRelations = relations(cardColumn, ({ one, many }) => ({
	module: one(wrkspaceModule, { fields: [cardColumn.moduleId], references: [wrkspaceModule.id] }),
	cards: many(boardCard)
}));

export const boardCardRelations = relations(boardCard, ({ one }) => ({
	column: one(cardColumn, { fields: [boardCard.columnId], references: [cardColumn.id] })
}));

export const docPageRelations = relations(docPage, ({ one }) => ({
	module: one(wrkspaceModule, { fields: [docPage.moduleId], references: [wrkspaceModule.id] })
}));

export const taskItemRelations = relations(taskItem, ({ one, many }) => ({
	module: one(wrkspaceModule, { fields: [taskItem.moduleId], references: [wrkspaceModule.id] }),
	assignees: many(taskAssignee),
	attachments: many(taskAttachment),
	blocking: many(taskDependency, { relationName: 'blocking' }),
	blockedBy: many(taskDependency, { relationName: 'blockedBy' })
}));

export const taskDependencyRelations = relations(taskDependency, ({ one }) => ({
	fromTask: one(taskItem, {
		fields: [taskDependency.fromTaskId],
		references: [taskItem.id],
		relationName: 'blocking'
	}),
	toTask: one(taskItem, {
		fields: [taskDependency.toTaskId],
		references: [taskItem.id],
		relationName: 'blockedBy'
	})
}));

export const taskModuleSettingsRelations = relations(taskModuleSettings, ({ one }) => ({
	module: one(wrkspaceModule, {
		fields: [taskModuleSettings.moduleId],
		references: [wrkspaceModule.id]
	})
}));

export const taskAssigneeRelations = relations(taskAssignee, ({ one }) => ({
	task: one(taskItem, { fields: [taskAssignee.taskId], references: [taskItem.id] }),
	user: one(user, { fields: [taskAssignee.userId], references: [user.id] })
}));

export const taskAttachmentRelations = relations(taskAttachment, ({ one }) => ({
	task: one(taskItem, { fields: [taskAttachment.taskId], references: [taskItem.id] }),
	uploader: one(user, { fields: [taskAttachment.uploadedBy], references: [user.id] })
}));

export const activityEventRelations = relations(activityEvent, ({ one, many }) => ({
	wrkspace: one(wrkspace, { fields: [activityEvent.wrkspaceId], references: [wrkspace.id] }),
	actor: one(user, { fields: [activityEvent.actorUserId], references: [user.id] }),
	module: one(wrkspaceModule, { fields: [activityEvent.moduleId], references: [wrkspaceModule.id] }),
	notifications: many(notification)
}));

export const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, { fields: [notification.userId], references: [user.id] }),
	activityEvent: one(activityEvent, {
		fields: [notification.activityEventId],
		references: [activityEvent.id]
	})
}));

export const userNotificationPreferenceRelations = relations(
	userNotificationPreference,
	({ one }) => ({
		user: one(user, { fields: [userNotificationPreference.userId], references: [user.id] })
	})
);

export * from './auth.schema';
