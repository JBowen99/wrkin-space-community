// MCP tools for wrkin-space. When you add/change a tool here, also update the
// tool reference in the public Agent Skill:
//   wrkin-space-skill/skills/wrkin-space/references/mcp-tools.md
// (repo: github.com/JBowen99/wrkin-space-skill)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiUser } from '../api/auth.ts';
import { applyTaskUpdate } from '../api/task-update.ts';
import { listTeamsForUser } from '../teams.ts';
import { listWrkspacesForTeam } from '../wrkspaces.ts';
import { listModulesWithPreviews, listChatMessages, addChatMessage } from '../modules.ts';
import {
	listTasks,
	createTask,
	deleteTask,
	listTeamMembersForWrkspace,
	type TaskInput
} from '../tasks.ts';
import {
	listForumThreads,
	getForumThread,
	listForumPosts,
	createForumThread,
	createForumPost
} from '../forum.ts';
import { listDecisions, getDecision, createDecision, type DecisionInput } from '../decisions.ts';
import {
	DEFAULT_TASK_PRIORITY,
	DEFAULT_TASK_STATUS,
	isTaskPriority,
	isTaskStatus
} from '../../shared/tasks';
import { DEFAULT_DECISION_STATUS, isDecisionStatus } from '../../shared/decisions';

const SERVER_INFO = { name: 'wrkin-space', version: '1.0.0' } as const;

function textResult(payload: unknown) {
	return {
		content: [
			{
				type: 'text' as const,
				text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
			}
		]
	};
}

function errorResult(message: string) {
	return {
		isError: true,
		content: [{ type: 'text' as const, text: message }]
	};
}

const SLUG_PARAMS = {
	teamSlug: z.string().describe('Team slug'),
	wrkspaceSlug: z.string().describe('Wrkspace slug')
} as const;

const MODULE_PARAMS = {
	...SLUG_PARAMS,
	moduleId: z.string().describe('Module id')
} as const;

/**
 * Builds a fresh MCP server bound to the resolved API user. Tools delegate to the
 * standard `$lib/server` functions, which self-authorize via the user id.
 * Stateless: one server instance is created per request.
 */
export function createWrkinMcpServer(user: ApiUser): McpServer {
	const server = new McpServer(SERVER_INFO);

	// --- Navigation -------------------------------------------------------

	server.tool('list_teams', 'List the teams the caller belongs to.', {}, async () => {
		const teams = await listTeamsForUser(user.id);
		return textResult(teams.map((t) => ({ id: t.id, name: t.name, slug: t.slug, role: t.role })));
	});

	server.tool(
		'list_wrkspaces',
		'List the wrkspaces (projects) within a team.',
		{ teamSlug: z.string().describe('Team slug') },
		async ({ teamSlug }) => {
			const wrkspaces = await listWrkspacesForTeam(user.id, teamSlug);
			return textResult(
				wrkspaces.map((w) => ({
					id: w.id,
					name: w.name,
					slug: w.slug,
					description: w.description
				}))
			);
		}
	);

	server.tool(
		'list_modules',
		'List the enabled modules in a wrkspace.',
		{ ...SLUG_PARAMS },
		async ({ teamSlug, wrkspaceSlug }) => {
			const modules = await listModulesWithPreviews(user.id, teamSlug, wrkspaceSlug);
			return textResult(
				modules.map((m) => ({ id: m.id, type: m.type, title: m.title, position: m.position }))
			);
		}
	);

	server.tool(
		'list_members',
		'List the members of a wrkspace (use the ids for assignees or decision participants).',
		{ ...SLUG_PARAMS },
		async ({ teamSlug, wrkspaceSlug }) => {
			const members = await listTeamMembersForWrkspace(user.id, teamSlug, wrkspaceSlug);
			return textResult(members.map((m) => ({ id: m.id, name: m.name })));
		}
	);

	// --- Tasks ------------------------------------------------------------

	server.tool(
		'list_tasks',
		'List tasks in a tasks module.',
		{ ...MODULE_PARAMS },
		async ({ teamSlug, wrkspaceSlug, moduleId }) => {
			const tasks = await listTasks(user.id, teamSlug, wrkspaceSlug, moduleId);
			return textResult(
				tasks.map((t) => ({
					id: t.id,
					title: t.title,
					description: t.description,
					status: t.status,
					priority: t.priority,
					dueAt: t.dueAt,
					completedAt: t.completedAt,
					assignees: t.assignees.map((a) => ({ id: a.userId, name: a.name }))
				}))
			);
		}
	);

	server.tool(
		'create_task',
		'Create a task in a tasks module. Returns the new task id.',
		{
			...MODULE_PARAMS,
			title: z.string().describe('Task title'),
			description: z.string().optional().describe('Optional description'),
			status: z
				.string()
				.optional()
				.describe('Optional status (backlog, todo, in_progress, review, done)'),
			priority: z.string().optional().describe('Optional priority (low, medium, high, urgent)'),
			dueAt: z.string().optional().describe('Optional due date (ISO 8601)'),
			assigneeIds: z.array(z.string()).optional().describe('Optional assignee user ids')
		},
		async ({
			teamSlug,
			wrkspaceSlug,
			moduleId,
			title,
			description,
			status,
			priority,
			dueAt,
			assigneeIds
		}) => {
			const input: TaskInput = {
				title,
				description: description ?? '',
				notes: '',
				status: status && isTaskStatus(status) ? status : DEFAULT_TASK_STATUS,
				priority: priority && isTaskPriority(priority) ? priority : DEFAULT_TASK_PRIORITY,
				startsAt: null,
				dueAt: dueAt ? new Date(dueAt) : null,
				completedAt: null,
				assigneeIds: assigneeIds ?? [],
				blockedByIds: [],
				percentDone: 0,
				customColor: null,
				tagIds: [],
				newTagNames: [],
				links: []
			};
			const id = await createTask(user.id, teamSlug, wrkspaceSlug, moduleId, input);
			if (!id) return errorResult('Could not create task (access denied or wrong module type).');
			return textResult({ id });
		}
	);

	server.tool(
		'update_task',
		'Update an existing task. Only the fields you provide are changed; omitted fields keep their current value. Pass an empty assigneeIds array to clear assignees.',
		{
			...MODULE_PARAMS,
			taskId: z.string().describe('Task id'),
			title: z.string().optional().describe('New title'),
			description: z.string().optional().describe('New description'),
			status: z
				.string()
				.optional()
				.describe('New status (backlog, todo, in_progress, review, done)'),
			priority: z.string().optional().describe('New priority (low, medium, high, urgent)'),
			dueAt: z.string().optional().describe('New due date (ISO 8601)'),
			assigneeIds: z.array(z.string()).optional().describe('New assignee user ids')
		},
		async ({
			teamSlug,
			wrkspaceSlug,
			moduleId,
			taskId,
			title,
			description,
			status,
			priority,
			dueAt,
			assigneeIds
		}) => {
			const ok = await applyTaskUpdate(user.id, teamSlug, wrkspaceSlug, moduleId, taskId, {
				title,
				description,
				status,
				priority,
				dueAt,
				assigneeIds
			});
			if (!ok) return errorResult('Task not found, or could not update (access/validation).');
			return textResult({ id: taskId, updated: true });
		}
	);

	server.tool(
		'delete_task',
		'Delete a task.',
		{
			...MODULE_PARAMS,
			taskId: z.string().describe('Task id')
		},
		async ({ teamSlug, wrkspaceSlug, moduleId, taskId }) => {
			const ok = await deleteTask(user.id, teamSlug, wrkspaceSlug, moduleId, taskId);
			if (!ok) return errorResult('Could not delete task (not found or no access).');
			return textResult({ id: taskId, deleted: true });
		}
	);

	// --- Forum ------------------------------------------------------------

	server.tool(
		'list_forum_threads',
		'List threads in a forum module.',
		{
			...MODULE_PARAMS,
			q: z.string().optional().describe('Optional search query')
		},
		async ({ teamSlug, wrkspaceSlug, moduleId, q }) => {
			const page = await listForumThreads(user.id, teamSlug, wrkspaceSlug, moduleId, {
				q: q ?? undefined
			});
			return textResult(
				page.threads.map((t) => ({
					id: t.id,
					title: t.title,
					authorName: t.authorName,
					replyCount: t.replyCount,
					excerpt: t.excerpt,
					updatedAt: t.updatedAt,
					closedAt: t.closedAt
				}))
			);
		}
	);

	server.tool(
		'get_forum_thread',
		'Get a forum thread and its posts.',
		{
			...MODULE_PARAMS,
			threadId: z.string().describe('Thread id')
		},
		async ({ teamSlug, wrkspaceSlug, moduleId, threadId }) => {
			const thread = await getForumThread(user.id, teamSlug, wrkspaceSlug, moduleId, threadId);
			if (!thread) return errorResult('Thread not found (or no access).');
			const posts = await listForumPosts(user.id, teamSlug, wrkspaceSlug, moduleId, threadId);
			return textResult({
				id: thread.id,
				title: thread.title,
				authorName: thread.authorName,
				createdAt: thread.createdAt,
				updatedAt: thread.updatedAt,
				closedAt: thread.closedAt,
				posts: posts.map((p) => ({
					id: p.id,
					authorName: p.authorName,
					body: p.body,
					parentId: p.parentId,
					createdAt: p.createdAt
				}))
			});
		}
	);

	server.tool(
		'create_forum_thread',
		'Start a new forum thread. Returns the new thread id.',
		{
			...MODULE_PARAMS,
			title: z.string().describe('Thread title'),
			body: z.string().describe('Body of the first post')
		},
		async ({ teamSlug, wrkspaceSlug, moduleId, title, body }) => {
			const id = await createForumThread(user.id, teamSlug, wrkspaceSlug, moduleId, title, body);
			if (!id) return errorResult('Could not create thread (access denied or empty content).');
			return textResult({ id });
		}
	);

	server.tool(
		'create_forum_post',
		'Reply to a forum thread. Returns whether the post was created.',
		{
			...MODULE_PARAMS,
			threadId: z.string().describe('Thread id to reply in'),
			body: z.string().describe('Post body'),
			parentId: z
				.string()
				.optional()
				.describe('Optional parent post id to reply to a specific post')
		},
		async ({ teamSlug, wrkspaceSlug, moduleId, threadId, body, parentId }) => {
			const ok = await createForumPost(
				user.id,
				teamSlug,
				wrkspaceSlug,
				moduleId,
				threadId,
				body,
				parentId ?? null
			);
			if (!ok) {
				return errorResult('Could not create post (thread closed, not found, or no access).');
			}
			return textResult({ threadId, created: true });
		}
	);

	// --- Decisions --------------------------------------------------------

	server.tool(
		'list_decisions',
		'List decision records in a decisions module.',
		{
			...MODULE_PARAMS,
			q: z.string().optional().describe('Optional search query')
		},
		async ({ teamSlug, wrkspaceSlug, moduleId, q }) => {
			const page = await listDecisions(user.id, teamSlug, wrkspaceSlug, moduleId, {
				q: q ?? undefined
			});
			return textResult(
				page.decisions.map((d) => ({
					id: d.id,
					title: d.title,
					summary: d.summary,
					status: d.status,
					authorName: d.authorName,
					decidedAt: d.decidedAt,
					updatedAt: d.updatedAt
				}))
			);
		}
	);

	server.tool(
		'get_decision',
		'Get a single decision record with its rationale, participants, and links.',
		{
			...MODULE_PARAMS,
			decisionId: z.string().describe('Decision id')
		},
		async ({ teamSlug, wrkspaceSlug, moduleId, decisionId }) => {
			const decision = await getDecision(user.id, teamSlug, wrkspaceSlug, moduleId, decisionId);
			if (!decision) return errorResult('Decision not found (or no access).');
			return textResult({
				id: decision.id,
				title: decision.title,
				summary: decision.summary,
				rationale: decision.rationale,
				status: decision.status,
				decidedAt: decision.decidedAt,
				authorName: decision.authorName,
				participants: decision.participants.map((p) => ({ id: p.id, name: p.name })),
				links: decision.links.map((l) => ({
					targetType: l.targetType,
					title: l.title,
					href: l.href
				})),
				createdAt: decision.createdAt,
				updatedAt: decision.updatedAt
			});
		}
	);

	server.tool(
		'create_decision',
		'Create a decision record in a decisions module. Returns the new decision id.',
		{
			...MODULE_PARAMS,
			title: z.string().describe('Decision title'),
			summary: z.string().optional().describe('Short summary'),
			rationale: z.string().optional().describe('Rationale / explanation'),
			status: z.string().optional().describe('Status (draft, accepted, deprecated, superseded)'),
			decidedAt: z.string().optional().describe('Optional decided date (ISO 8601)'),
			participantIds: z.array(z.string()).optional().describe('Optional participant user ids')
		},
		async ({
			teamSlug,
			wrkspaceSlug,
			moduleId,
			title,
			summary,
			rationale,
			status,
			decidedAt,
			participantIds
		}) => {
			const input: DecisionInput = {
				title,
				summary: summary ?? '',
				rationale: rationale ?? '',
				status: status && isDecisionStatus(status) ? status : DEFAULT_DECISION_STATUS,
				decidedAt: decidedAt ? new Date(decidedAt) : null,
				participantIds: participantIds ?? [],
				supersedesId: null,
				links: []
			};
			const id = await createDecision(user.id, teamSlug, wrkspaceSlug, moduleId, input);
			if (!id)
				return errorResult('Could not create decision (access denied or wrong module type).');
			return textResult({ id });
		}
	);

	// --- Chat -------------------------------------------------------------

	server.tool(
		'list_chat_messages',
		'List messages in a chat module.',
		{
			...MODULE_PARAMS,
			q: z.string().optional().describe('Optional search query')
		},
		async ({ teamSlug, wrkspaceSlug, moduleId, q }) => {
			const messages = await listChatMessages(user.id, teamSlug, wrkspaceSlug, moduleId, {
				q: q ?? undefined
			});
			return textResult(
				messages.map((m) => ({
					id: m.id,
					body: m.body,
					authorName: m.authorName,
					createdAt: m.createdAt
				}))
			);
		}
	);

	server.tool(
		'send_chat_message',
		'Send a message to a chat module.',
		{
			...MODULE_PARAMS,
			body: z.string().describe('Message body')
		},
		async ({ teamSlug, wrkspaceSlug, moduleId, body }) => {
			const ok = await addChatMessage(user.id, teamSlug, wrkspaceSlug, moduleId, body);
			if (!ok)
				return errorResult('Could not send message (empty, no access, or wrong module type).');
			return textResult({ sent: true });
		}
	);

	return server;
}
