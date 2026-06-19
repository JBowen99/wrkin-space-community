/** Graduated-depth wrkspaces on Acme Labs (§6). */

export const SEED_SIMPLE = {
	wrkspaceId: 'acme-simple',
	chat: {
		moduleId: 'seed-chat-acme-simple',
		title: 'Chat',
		position: 0,
		messages: [
			{
				id: 'seed-simple-msg-1',
				author: 'primary' as const,
				body: 'Welcome to the pilot wrkspace.'
			},
			{
				id: 'seed-simple-msg-2',
				author: 'secondary' as const,
				body: 'Keeping this one minimal — chat and tasks only.'
			},
			{
				id: 'seed-simple-msg-3',
				author: 'primary' as const,
				body: 'Perfect for a quick first-run demo.'
			}
		]
	},
	tasks: {
		moduleId: 'seed-tasks-acme-simple',
		title: 'Tasks',
		position: 1,
		items: [
			{
				id: 'seed-simple-task-1',
				title: 'Review pilot checklist',
				description: 'Confirm must-haves before sharing with stakeholders.',
				status: 'todo' as const,
				priority: 'medium' as const,
				position: 0,
				assignees: ['primary'] as const
			},
			{
				id: 'seed-simple-task-2',
				title: 'Schedule kickoff',
				description: 'Book a 30-minute sync with the team.',
				status: 'backlog' as const,
				priority: 'low' as const,
				position: 1,
				assignees: ['secondary'] as const
			}
		]
	}
} as const;

export const SEED_MEDIUM = {
	wrkspaceId: 'acme-medium',
	chat: {
		moduleId: 'seed-chat-acme-medium',
		title: 'Chat',
		position: 0,
		messages: [
			{
				id: 'seed-medium-msg-1',
				author: 'primary' as const,
				body: 'Product beta wrkspace is live.'
			},
			{
				id: 'seed-medium-msg-2',
				author: 'secondary' as const,
				body: 'I added milestone dates to the calendar module.'
			},
			{
				id: 'seed-medium-msg-3',
				author: 'primary' as const,
				body: 'Forum thread for scope questions is open — link from tasks when ready.'
			},
			{
				id: 'seed-medium-msg-4',
				author: 'secondary' as const,
				body: 'Docs folder has the release notes draft.'
			}
		]
	},
	forum: {
		moduleId: 'seed-forum-acme-medium',
		title: 'Forum',
		position: 1,
		threads: [
			{
				id: 'seed-medium-thread-scope',
				title: 'Beta scope questions',
				author: 'primary' as const,
				openingPost: {
					id: 'seed-medium-forum-scope-op',
					body: 'What should we defer from the beta cut?'
				},
				replies: [
					{
						id: 'seed-medium-forum-scope-r1',
						author: 'secondary' as const,
						parentId: 'seed-medium-forum-scope-op',
						body: 'Custom emoji reactions — ship thumbs only for v1.'
					}
				]
			},
			{
				id: 'seed-medium-thread-docs',
				title: 'Docs structure feedback',
				author: 'secondary' as const,
				openingPost: {
					id: 'seed-medium-forum-docs-op',
					body: 'Does the guides folder layout work for onboarding?'
				},
				replies: []
			}
		]
	},
	calendar: {
		moduleId: 'seed-calendar-acme-medium',
		title: 'Calendar',
		position: 2,
		events: [
			{
				id: 'seed-medium-event-sync',
				title: 'Weekly beta sync',
				description: 'Status and blockers.',
				dayOffset: 2,
				startHour: 10,
				durationMinutes: 30
			},
			{
				id: 'seed-medium-event-review',
				title: 'Design review',
				dayOffset: 5,
				startHour: 14,
				durationMinutes: 60
			},
			{
				id: 'seed-medium-event-beta',
				title: 'Beta launch',
				dayOffset: 14,
				startHour: 9,
				durationMinutes: 60
			}
		]
	},
	tasks: {
		moduleId: 'seed-tasks-acme-medium',
		title: 'Tasks',
		position: 3,
		items: [
			{
				id: 'seed-medium-task-scope',
				title: 'Define launch scope',
				description: 'Agree on must-haves for the first release.',
				status: 'todo' as const,
				priority: 'high' as const,
				position: 0,
				assignees: ['primary'] as const
			},
			{
				id: 'seed-medium-task-decisions',
				title: 'Review open decisions',
				description: 'Close or defer items blocking delivery.',
				status: 'in_progress' as const,
				priority: 'medium' as const,
				position: 1,
				assignees: ['secondary'] as const
			},
			{
				id: 'seed-medium-task-checkin',
				title: 'Schedule milestone check-in',
				description: 'Book a calendar slot with stakeholders.',
				status: 'backlog' as const,
				priority: 'low' as const,
				position: 2,
				assignees: ['primary'] as const
			},
			{
				id: 'seed-medium-task-docs',
				title: 'Publish release notes draft',
				description: 'Move the doc page out of draft.',
				status: 'todo' as const,
				priority: 'medium' as const,
				position: 3,
				assignees: ['secondary'] as const
			}
		]
	},
	docs: {
		moduleId: 'seed-docs-acme-medium',
		title: 'Docs',
		position: 4,
		folders: [
			{
				id: 'seed-medium-doc-folder',
				name: 'Release',
				parentId: null as string | null,
				position: 0
			}
		],
		pages: [
			{
				id: 'seed-medium-doc-notes',
				title: 'Beta release notes',
				folderId: 'seed-medium-doc-folder',
				position: 0,
				previewText: 'Highlights, known issues, and upgrade notes for beta.'
			}
		],
		assets: [
			{
				id: 'seed-medium-doc-link',
				kind: 'link' as const,
				title: 'Status page mock',
				folderId: null,
				url: 'https://example.com/status',
				position: 0
			}
		]
	}
} as const;

/** Light wrkspaces on Northwind / Bridge — chat + tasks only. */
export function seedLightProfile(wrkspaceId: string) {
	const prefix = wrkspaceId.replace(/-/g, '_');
	return {
		wrkspaceId,
		chat: {
			moduleId: `seed-chat-${wrkspaceId}`,
			title: 'Chat',
			position: 0,
			messages: [
				{
					id: `seed-light-${prefix}-msg-1`,
					author: 'primary' as const,
					body: `Updates for ${wrkspaceId.replace(/-/g, ' ')} go here.`
				},
				{
					id: `seed-light-${prefix}-msg-2`,
					author: 'secondary' as const,
					body: 'Light seed profile — chat and tasks for day-to-day work.'
				},
				{
					id: `seed-light-${prefix}-msg-3`,
					author: 'primary' as const,
					body: 'Ping the channel when blockers come up.'
				}
			]
		},
		tasks: {
			moduleId: `seed-tasks-${wrkspaceId}`,
			title: 'Tasks',
			position: 1,
			items: [
				{
					id: `seed-light-${prefix}-task-1`,
					title: 'Weekly status update',
					description: 'Summarize progress and blockers.',
					status: 'todo' as const,
					priority: 'medium' as const,
					position: 0,
					assignees: ['primary'] as const
				},
				{
					id: `seed-light-${prefix}-task-2`,
					title: 'Review open items',
					description: 'Triage backlog before the next sync.',
					status: 'backlog' as const,
					priority: 'low' as const,
					position: 1,
					assignees: ['secondary'] as const
				},
				{
					id: `seed-light-${prefix}-task-3`,
					title: 'Document decisions',
					description: 'Capture outcomes in the wrkspace docs or forum.',
					status: 'backlog' as const,
					priority: 'low' as const,
					position: 2,
					assignees: ['primary'] as const
				}
			]
		}
	} as const;
}

export const SEED_LIGHT_WRKSPACE_IDS = [
	'nw-client-alpha',
	'nw-client-beta',
	'nw-internal',
	'bridge-research',
	'bridge-partner',
	'bridge-archive'
] as const;
