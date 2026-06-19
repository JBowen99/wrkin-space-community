import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { listTasks, createTask, type TaskInput } from '$lib/server/tasks';
import {
	DEFAULT_TASK_PRIORITY,
	DEFAULT_TASK_STATUS,
	isTaskPriority,
	isTaskStatus
} from '$lib/shared/tasks';

type CreateTaskBody = {
	title?: unknown;
	description?: unknown;
	status?: unknown;
	priority?: unknown;
	dueAt?: unknown;
	assigneeIds?: unknown;
};

export const GET: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);
	const tasks = await listTasks(user.id, params.teamSlug, params.wrkspaceSlug, params.moduleId);
	return json(
		tasks.map((t) => ({
			id: t.id,
			title: t.title,
			description: t.description,
			status: t.status,
			priority: t.priority,
			startsAt: t.startsAt,
			dueAt: t.dueAt,
			completedAt: t.completedAt,
			position: t.position,
			assignees: t.assignees.map((a) => ({ id: a.userId, name: a.name })),
			tags: t.tags.map((tag) => ({ id: tag.id, name: tag.name }))
		}))
	);
};

export const POST: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);

	let body: CreateTaskBody;
	try {
		body = (await request.json()) as CreateTaskBody;
	} catch {
		error(400, 'Invalid JSON body');
	}

	const title = typeof body.title === 'string' ? body.title.trim() : '';
	if (!title) error(400, 'title is required');

	const status =
		typeof body.status === 'string' && isTaskStatus(body.status)
			? body.status
			: DEFAULT_TASK_STATUS;
	const priority =
		typeof body.priority === 'string' && isTaskPriority(body.priority)
			? body.priority
			: DEFAULT_TASK_PRIORITY;

	const assigneeIds = Array.isArray(body.assigneeIds)
		? body.assigneeIds.filter((id): id is string => typeof id === 'string')
		: [];

	const dueAt = typeof body.dueAt === 'string' && body.dueAt ? new Date(body.dueAt) : null;

	const input: TaskInput = {
		title,
		description: typeof body.description === 'string' ? body.description : '',
		notes: '',
		status,
		priority,
		startsAt: null,
		dueAt,
		completedAt: null,
		assigneeIds,
		blockedByIds: [],
		percentDone: 0,
		customColor: null,
		tagIds: [],
		newTagNames: [],
		links: []
	};

	const id = await createTask(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		input
	);

	if (!id) error(403, 'Could not create task');
	return json({ id }, { status: 201 });
};
