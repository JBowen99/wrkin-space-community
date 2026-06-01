/** Shared seed defaults — safe to import from app code and scripts. */
export const SEED_USER = {
	email: 'test@wrkin.local',
	password: 'password123',
	name: 'Test User',
	image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-test'
} as const;

export const SEED_USER_2 = {
	email: 'alex@wrkin.local',
	password: 'password123',
	name: 'Alex Morgan',
	image: 'https://api.dicebear.com/9.x/thumbs/svg?seed=wrkin-alex'
} as const;

export const SEED_TEAM = {
	id: 'seed-personal',
	name: 'Personal',
	slug: 'personal'
} as const;

export const SEED_WRKSPACES = [
	{
		id: 'platform-alpha',
		name: 'Platform Alpha',
		slug: 'platform-alpha',
		description: 'Core product launch and delivery'
	},
	{
		id: 'design-system',
		name: 'Design System',
		slug: 'design-system',
		description: 'Components, tokens, and documentation'
	}
] as const;

const SEED_CHAT_SNIPPETS = [
	'Pushed a fix for the module drag handle — can someone sanity-check on staging?',
	'Staging looks good from here. One pixel gap on the cards column header though.',
	'Logged it — will bundle with the hover-state pass.',
	'Forum thread on beta priorities is getting long. Worth a sync tomorrow?',
	'Yes — I added a calendar hold for 10am. Agenda in the doc module draft.',
	'API rate-limit headers are live in staging. Clients should read `X-RateLimit-Remaining`.',
	'Nice. I’ll update the onboarding copy to mention limits for free tier.',
	'Anyone opposed to cutting custom emoji reactions from beta? Saves a few days.',
	'Fine by me if we ship 👍/👎 only for v1.',
	'Agreed — keeping scope tight.',
	'Design system wrkspace is updated with new button tokens.',
	'Saw it — syncing Platform Alpha screens this afternoon.',
	'Postmortem notes for last week’s deploy glitch are in the forum.',
	'Read them — the connection pool change makes sense.',
	'Reminder: freeze on schema migrations after Thursday.',
	'Got it. Migrations for task dependencies are merged already.',
	'Customer preview list is at 12 teams — aiming for 20 by beta.',
	'I can reach out to three more from the waitlist.',
	"That'd help — I'll share the blurb in DM.",
	'Wrkspace invite links expire after 7 days now, right?',
	'Yes — configurable per team on Plus.',
	'Love it. Less stale invites floating around.',
	'Heads up: forum search is slow with 50+ threads — might be index-related.',
	'I’ll profile after lunch. We only have a handful in seed data but prod will grow.',
	'Quick poll: default module order — chat first or tasks first?',
	'Chat first for collaboration-heavy teams; tasks first for solo — we could make it a template.',
	'Templates sound right for GA. For beta, chat first is fine.',
	'Shipping the seed script update so local dev feels busier 🌱',
	'Ha — the scrollback finally looks real.',
	'Last thing: who’s on point for the beta launch dry run?',
	'I can run it — will use calendar events as the checklist.',
	'Perfect — ping the channel if you need a second pair of eyes.'
] as const;

const SEED_CHAT_EXTRA_MESSAGES = SEED_CHAT_SNIPPETS.map((body, index) => {
	const n = index + 6;
	return {
		id: `seed-msg-${n}`,
		author: (n % 2 === 0 ? 'secondary' : 'primary') as 'primary' | 'secondary',
		body
	};
});

/** Platform Alpha wrkspace — pre-seeded chat for local dev. */
export const SEED_CHAT = {
	wrkspaceId: 'platform-alpha',
	module: {
		id: 'seed-chat-platform-alpha',
		type: 'chat' as const,
		title: 'Chat 1',
		position: 0
	},
	messages: [
		{
			id: 'seed-msg-1',
			author: 'primary' as const,
			body: 'Hey team — kicking off the launch wrkspace here.'
		},
		{
			id: 'seed-msg-2',
			author: 'secondary' as const,
			body: 'Sounds good. I’ll post design review notes by EOD.'
		},
		{
			id: 'seed-msg-3',
			author: 'primary' as const,
			body: 'Perfect. Can you also confirm the milestone dates in the calendar module?'
		},
		{
			id: 'seed-msg-4',
			author: 'secondary' as const,
			body: 'On it — I’ll add the beta and GA dates this afternoon.'
		},
		{
			id: 'seed-msg-5',
			author: 'primary' as const,
			body: 'Thanks Alex 👍'
		},
		...SEED_CHAT_EXTRA_MESSAGES
	]
} as const;

/** Platform Alpha wrkspace — pre-seeded card board for local dev. */
export const SEED_CARDS = {
	wrkspaceId: 'platform-alpha',
	module: {
		id: 'seed-cards-platform-alpha',
		type: 'cards' as const,
		title: 'Cards 1',
		position: 1
	},
	columns: [
		{
			id: 'seed-col-backlog',
			title: 'Backlog',
			color: '#64748b',
			position: 0,
			cards: [
				{
					id: 'seed-card-beta',
					title: 'Finalize beta checklist',
					body: 'Review launch criteria and open items.',
					position: 0
				},
				{
					id: 'seed-card-landing',
					title: 'Ship landing page',
					body: 'Copy, assets, and analytics hooks.',
					position: 1
				},
				{
					id: 'seed-card-status-page',
					title: 'Status page for beta',
					body: 'Public uptime + incident comms.',
					position: 2
				},
				{
					id: 'seed-card-invites',
					title: 'Invite link expiry',
					body: '7-day default; document Plus override.',
					position: 3
				}
			]
		},
		{
			id: 'seed-col-progress',
			title: 'In progress',
			color: '#3b82f6',
			position: 1,
			cards: [
				{
					id: 'seed-card-api',
					title: 'API hardening',
					body: 'Rate limits and error shapes for v1.',
					position: 0
				},
				{
					id: 'seed-card-welcome',
					title: 'Welcome — drag me',
					body: 'Try moving this card to another column.',
					position: 1
				},
				{
					id: 'seed-card-forum-perf',
					title: 'Forum search performance',
					body: 'Index audit and query plan review.',
					position: 2
				},
				{
					id: 'seed-card-onboarding',
					title: 'Onboarding polish',
					body: 'Shorter first-run path per design review.',
					position: 3
				}
			]
		},
		{
			id: 'seed-col-done',
			title: 'Done',
			color: '#22c55e',
			position: 2,
			cards: [
				{
					id: 'seed-card-seed',
					title: 'Seed data wired',
					body: 'pnpm db:seed populates this board.',
					position: 0
				},
				{
					id: 'seed-card-pool',
					title: 'Connection pool tuning',
					body: 'Postmortem action item — merged.',
					position: 1
				},
				{
					id: 'seed-card-reactions',
					title: 'Chat reactions v1',
					body: 'Ship thumbs up/down only for beta.',
					position: 2
				}
			]
		}
	]
} as const;

const SEED_FORUM_BASE_THREADS = [
	{
		id: 'seed-thread-launch',
		title: 'Beta launch planning',
		author: 'primary' as const,
		openingPost: {
			id: 'seed-forum-post-launch-op',
			body: 'What should we prioritize for the beta cut? Drop ideas and concerns here.'
		},
		replies: [
			{
				id: 'seed-forum-post-launch-r1',
				author: 'secondary' as const,
				parentId: 'seed-forum-post-launch-op',
				body: 'I’d focus on onboarding and the docs module — those block early adopters.'
			},
			{
				id: 'seed-forum-post-launch-r2',
				author: 'primary' as const,
				parentId: 'seed-forum-post-launch-r1',
				body: 'Agreed. I’ll sync with design on a shorter first-run path.'
			},
			{
				id: 'seed-forum-post-launch-r3',
				author: 'secondary' as const,
				parentId: 'seed-forum-post-launch-op',
				body: 'Also worth a lightweight status page before we invite external teams.'
			},
			{
				id: 'seed-forum-post-launch-r4',
				author: 'primary' as const,
				parentId: 'seed-forum-post-launch-r3',
				body: 'Good call — I’ll stub something this week.'
			}
		]
	},
	{
		id: 'seed-thread-design',
		title: 'Design review feedback',
		author: 'secondary' as const,
		openingPost: {
			id: 'seed-forum-post-design-op',
			body: 'Posting notes from yesterday’s review — please thread replies per screen.'
		},
		replies: [
			{
				id: 'seed-forum-post-design-r1',
				author: 'primary' as const,
				parentId: 'seed-forum-post-design-op',
				body: 'Dashboard module grid looks good. Will tweak hover states.'
			},
			{
				id: 'seed-forum-post-design-r2',
				author: 'secondary' as const,
				parentId: 'seed-forum-post-design-r1',
				body: 'Hover contrast is the main ask — WCAG AA on secondary buttons.'
			},
			{
				id: 'seed-forum-post-design-r3',
				author: 'primary' as const,
				parentId: 'seed-forum-post-design-op',
				body: 'Settings sidebar: can we collapse module list on narrow viewports?'
			}
		]
	},
	{
		id: 'seed-thread-rfc-modules',
		title: 'RFC: module permissions model',
		author: 'primary' as const,
		openingPost: {
			id: 'seed-forum-post-rfc-op',
			body: 'Draft RFC for wrkspace-level vs module-level roles. Feedback welcome before we implement.'
		},
		replies: [
			{
				id: 'seed-forum-post-rfc-r1',
				author: 'secondary' as const,
				parentId: 'seed-forum-post-rfc-op',
				body: 'Module-level is more flexible but harder to explain in the UI.'
			},
			{
				id: 'seed-forum-post-rfc-r2',
				author: 'primary' as const,
				parentId: 'seed-forum-post-rfc-r1',
				body: 'Maybe ship wrkspace-level for beta and add module overrides in v1.1.'
			}
		]
	},
	{
		id: 'seed-thread-postmortem',
		title: 'Postmortem: staging deploy 2025-05-12',
		author: 'secondary' as const,
		openingPost: {
			id: 'seed-forum-post-pm-op',
			body: 'Summary: connection pool exhaustion during a load test. Root cause and action items below.'
		},
		replies: [
			{
				id: 'seed-forum-post-pm-r1',
				author: 'primary' as const,
				parentId: 'seed-forum-post-pm-op',
				body: 'Pool size bump is merged. Monitoring alerts added for wait time > 100ms.'
			},
			{
				id: 'seed-forum-post-pm-r2',
				author: 'secondary' as const,
				parentId: 'seed-forum-post-pm-r1',
				body: 'Thanks — I’ll watch metrics through the weekend.'
			}
		]
	},
	{
		id: 'seed-thread-hiring',
		title: 'Hiring: frontend engineer',
		author: 'primary' as const,
		openingPost: {
			id: 'seed-forum-post-hiring-op',
			body: 'Opening for a senior frontend engineer (SvelteKit). Interview loop and rubric draft attached in docs.'
		},
		replies: [
			{
				id: 'seed-forum-post-hiring-r1',
				author: 'secondary' as const,
				parentId: 'seed-forum-post-hiring-op',
				body: 'Rubric looks solid. Suggest a take-home focused on module UI patterns we actually use.'
			}
		]
	}
] as const;

const SEED_FORUM_WEEKLY_TOPICS = [
	'API hardening and error shapes',
	'Onboarding flow polish',
	'Calendar + tasks integration',
	'Forum performance and indexing',
	'Cards module drag-and-drop edge cases',
	'Chat reactions scope for v1',
	'Billing and Plus tier copy',
	'Mobile layout pass',
	'Docs module structure',
	'Security review prep',
	'Seed data and local dev ergonomics',
	'Customer preview outreach',
	'Analytics events taxonomy',
	'Accessibility audit fixes',
	'Release checklist for beta',
	'Design system token migration',
	'Wrkspace templates discussion',
	'Support runbook draft',
	'Load testing results',
	'GA timeline sanity check'
] as const;

const SEED_FORUM_EXTRA_THREADS = SEED_FORUM_WEEKLY_TOPICS.map((topic, index) => {
	const n = index + 1;
	const author = (n % 2 === 0 ? 'secondary' : 'primary') as 'primary' | 'secondary';
	const other = author === 'primary' ? 'secondary' : 'primary';
	const opId = `seed-forum-post-extra-${n}-op`;
	const replies: {
		id: string;
		author: 'primary' | 'secondary';
		parentId: string;
		body: string;
	}[] = [];

	if (n % 2 === 0) {
		replies.push({
			id: `seed-forum-post-extra-${n}-r1`,
			author: other,
			parentId: opId,
			body: `Follow-up on ${topic.toLowerCase()} — no blockers from my side.`
		});
	}
	if (n % 3 === 0) {
		const parentId = replies[0]?.id ?? opId;
		replies.push({
			id: `seed-forum-post-extra-${n}-r2`,
			author,
			parentId,
			body: 'Capturing decisions here so we can link from the tasks module.'
		});
	}

	return {
		id: `seed-thread-extra-${n}`,
		title: `Weekly sync — ${topic}`,
		author,
		openingPost: {
			id: opId,
			body: `Notes and follow-ups: ${topic}. Add blockers or decisions below.`
		},
		replies
	};
});

/** Platform Alpha wrkspace — pre-seeded forum for local dev. */
export const SEED_FORUM = {
	wrkspaceId: 'platform-alpha',
	module: {
		id: 'seed-forum-platform-alpha',
		type: 'forum' as const,
		title: 'Forum 1',
		position: 3
	},
	threads: [...SEED_FORUM_BASE_THREADS, ...SEED_FORUM_EXTRA_THREADS]
} as const;

/** Platform Alpha wrkspace — pre-seeded calendar for local dev. */
export const SEED_CALENDAR = {
	wrkspaceId: 'platform-alpha',
	module: {
		id: 'seed-calendar-platform-alpha',
		type: 'calendar' as const,
		title: 'Calendar 1',
		position: 2
	},
	events: [
		{
			id: 'seed-event-design-review',
			title: 'Design review',
			description: 'Walk through launch screens and open design feedback.',
			dayOffset: -3,
			startHour: 14,
			durationMinutes: 90
		},
		{
			id: 'seed-event-sync',
			title: 'Weekly launch sync',
			description: 'Status, blockers, and owner updates for the launch track.',
			dayOffset: 2,
			startHour: 10,
			durationMinutes: 30
		},
		{
			id: 'seed-event-beta',
			title: 'Beta launch',
			description: 'Flip beta flag and monitor support channel.',
			dayOffset: 14,
			startHour: 9,
			durationMinutes: 60
		},
		{
			id: 'seed-event-ga',
			title: 'GA launch',
			dayOffset: 28,
			startHour: 9,
			durationMinutes: 120
		},
		{
			id: 'seed-event-standup',
			title: 'Daily standup',
			dayOffset: 0,
			startHour: 9,
			durationMinutes: 15
		},
		{
			id: 'seed-event-dry-run',
			title: 'Beta launch dry run',
			dayOffset: 12,
			startHour: 14,
			durationMinutes: 60
		},
		{
			id: 'seed-event-security',
			title: 'Security review',
			dayOffset: 7,
			startHour: 11,
			durationMinutes: 60
		},
		{
			id: 'seed-event-customer',
			title: 'Customer preview office hours',
			dayOffset: 5,
			startHour: 15,
			durationMinutes: 45
		},
		{
			id: 'seed-event-retro',
			title: 'Sprint retro',
			dayOffset: -1,
			startHour: 16,
			durationMinutes: 45
		},
		{
			id: 'seed-event-a11y',
			title: 'Accessibility audit readout',
			dayOffset: 10,
			startHour: 13,
			durationMinutes: 60
		},
		{
			id: 'seed-event-1on1',
			title: '1:1 — launch readiness',
			dayOffset: 3,
			startHour: 11,
			durationMinutes: 30
		}
	]
} as const;

/** Platform Alpha wrkspace — pre-seeded tasks module for local dev. */
export const SEED_TASKS = {
	wrkspaceId: 'platform-alpha',
	module: {
		id: 'seed-tasks-platform-alpha',
		type: 'tasks' as const,
		title: 'To-dos 1',
		position: 4
	},
	tasks: [
		{
			id: 'seed-task-api',
			title: 'API hardening',
			description: 'Rate limits and error shapes for v1.',
			notes: 'Pair with platform-alpha cards board item.',
			status: 'in_progress' as const,
			priority: 'high' as const,
			dayOffsetStart: -2,
			dayOffsetDue: 7,
			position: 0,
			percentDone: 50,
			assignees: ['primary', 'secondary'] as const
		},
		{
			id: 'seed-task-beta',
			title: 'Finalize beta checklist',
			description: 'Review launch criteria and open items.',
			notes: '',
			status: 'todo' as const,
			priority: 'medium' as const,
			dayOffsetStart: 1,
			dayOffsetDue: 12,
			position: 1,
			percentDone: 15,
			assignees: ['primary'] as const
		},
		{
			id: 'seed-task-landing',
			title: 'Ship landing page',
			description: 'Copy, assets, and analytics hooks.',
			notes: '',
			status: 'backlog' as const,
			priority: 'low' as const,
			dayOffsetStart: null,
			dayOffsetDue: 14,
			position: 0,
			percentDone: 0,
			assignees: ['secondary'] as const
		},
		{
			id: 'seed-task-design',
			title: 'Design review follow-up',
			description: 'Address feedback from yesterday’s review.',
			notes: 'Thread in forum module.',
			status: 'review' as const,
			priority: 'urgent' as const,
			dayOffsetStart: -1,
			dayOffsetDue: 2,
			position: 0,
			percentDone: 80,
			assignees: ['primary', 'secondary'] as const
		},
		{
			id: 'seed-task-seed',
			title: 'Seed data wired',
			description: 'pnpm db:seed populates sample tasks.',
			notes: '',
			status: 'done' as const,
			priority: 'low' as const,
			dayOffsetStart: -7,
			dayOffsetDue: -5,
			dayOffsetCompleted: -5,
			position: 0,
			percentDone: 100,
			assignees: ['primary'] as const
		},
		{
			id: 'seed-task-forum-perf',
			title: 'Forum search performance',
			description: 'Profile slow queries with realistic thread volume.',
			notes: 'See forum weekly sync thread.',
			status: 'todo' as const,
			priority: 'high' as const,
			dayOffsetStart: 0,
			dayOffsetDue: 5,
			position: 2,
			percentDone: 10,
			assignees: ['primary'] as const
		},
		{
			id: 'seed-task-status',
			title: 'Beta status page',
			description: 'Lightweight public status for preview customers.',
			notes: '',
			status: 'backlog' as const,
			priority: 'medium' as const,
			dayOffsetStart: null,
			dayOffsetDue: 10,
			position: 3,
			percentDone: 0,
			assignees: ['secondary'] as const
		},
		{
			id: 'seed-task-onboarding',
			title: 'Onboarding flow polish',
			description: 'Shorten first-run path from design review feedback.',
			notes: '',
			status: 'in_progress' as const,
			priority: 'medium' as const,
			dayOffsetStart: -1,
			dayOffsetDue: 6,
			position: 4,
			percentDone: 35,
			assignees: ['secondary'] as const
		},
		{
			id: 'seed-task-security',
			title: 'Security review prep',
			description: 'Checklist and evidence for external review.',
			notes: 'Calendar: security review event.',
			status: 'todo' as const,
			priority: 'urgent' as const,
			dayOffsetStart: 2,
			dayOffsetDue: 8,
			position: 5,
			percentDone: 5,
			assignees: ['primary', 'secondary'] as const
		},
		{
			id: 'seed-task-dry-run',
			title: 'Beta launch dry run',
			description: 'Walk through calendar milestones and comms plan.',
			notes: '',
			status: 'todo' as const,
			priority: 'high' as const,
			dayOffsetStart: 8,
			dayOffsetDue: 13,
			position: 6,
			percentDone: 0,
			assignees: ['primary'] as const
		}
	],
	dependencies: [
		{ fromTaskId: 'seed-task-seed', toTaskId: 'seed-task-api' },
		{ fromTaskId: 'seed-task-api', toTaskId: 'seed-task-beta' }
	] as const
} as const;

/**
 * Wrkspace IDs retired from the seed config. Deleted on reset if they still exist
 * outside the seed team (e.g. after a schema migration).
 */
export const DEPRECATED_SEED_WRKSPACE_IDS: string[] = [];

/** Everything `pnpm db:seed` owns — wiped before each run (dev only). */
export const SEED_OWNED = {
	teamId: SEED_TEAM.id,
	wrkspaceIds: SEED_WRKSPACES.map((w) => w.id),
	userEmails: [SEED_USER.email, SEED_USER_2.email]
} as const;
