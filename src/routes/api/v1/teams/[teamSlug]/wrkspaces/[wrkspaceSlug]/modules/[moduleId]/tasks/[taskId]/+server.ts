import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { applyTaskUpdate, type TaskUpdateFields } from '$lib/server/api/task-update';
import { deleteTask } from '$lib/server/tasks';

type UpdateTaskBody = {
	title?: unknown;
	description?: unknown;
	status?: unknown;
	priority?: unknown;
	dueAt?: unknown;
	assigneeIds?: unknown;
};

function parseUpdateBody(raw: unknown): TaskUpdateFields {
	const body = (raw ?? {}) as UpdateTaskBody;
	const fields: TaskUpdateFields = {};

	if (typeof body.title === 'string') fields.title = body.title;
	if (typeof body.description === 'string') fields.description = body.description;
	if (typeof body.status === 'string') fields.status = body.status;
	if (typeof body.priority === 'string') fields.priority = body.priority;
	if (typeof body.dueAt === 'string') fields.dueAt = body.dueAt;
	if (Array.isArray(body.assigneeIds)) {
		fields.assigneeIds = body.assigneeIds.filter((id): id is string => typeof id === 'string');
	}

	return fields;
}

export const PATCH: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const fields = parseUpdateBody(body);
	if (Object.keys(fields).length === 0) error(400, 'No updatable fields provided');

	const ok = await applyTaskUpdate(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.taskId,
		fields
	);

	if (!ok) error(404, 'Task not found');
	return json({ id: params.taskId, updated: true });
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);
	const ok = await deleteTask(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.taskId
	);
	if (!ok) error(404, 'Task not found');
	return json({ id: params.taskId, deleted: true });
};
