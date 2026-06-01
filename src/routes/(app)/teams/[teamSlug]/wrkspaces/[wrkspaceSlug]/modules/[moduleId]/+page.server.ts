import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getWrkspaceForUser } from '$lib/server/wrkspaces';
import {
	addBoardCard,
	addCalendarEvent,
	addCardColumn,
	addChatMessage,
	deleteBoardCard,
	deleteCalendarEvent,
	deleteModule,
	ensureCardBoardSeed,
	getModuleForUser,
	importCalendarEventsFromIcs,
	listCalendarEvents,
	listCardBoard,
	listChatMessages,
	moduleTypeLabel,
	moveBoardCard,
	moveCardColumn,
	toggleChatReaction,
	updateBoardCard,
	updateCardColumn,
	updateCalendarEvent,
	updateModuleTitle
} from '$lib/server/modules';
import { createDocPage, listDocPages } from '$lib/server/docs';
import { createForumThread, listForumThreads, parseForumThreadSort } from '$lib/server/forum';
import {
	addTaskDependency,
	createTask,
	deleteTask,
	getTaskModuleSettings,
	listTaskDependencies,
	listTasks,
	listTeamMembersForWrkspace,
	moveTask,
	parseTaskInputFromForm,
	parseTaskModuleSettingsFromForm,
	removeTaskDependency,
	updateTask,
	updateTaskModuleSettings,
	updateTaskSchedule
} from '$lib/server/tasks';
import { isTaskPriority, isTaskStatus, type TaskPriority, type TaskStatus } from '$lib/shared/tasks';

const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;
const MAX_ICS_IMPORT_BYTES = 2 * 1024 * 1024;

function parseEventTimesFromForm(formData: FormData): { startsAt: Date; endsAt: Date } | null {
	const startsAtStr = formData.get('startsAt')?.toString() ?? '';
	const endsAtStr = formData.get('endsAt')?.toString() ?? '';

	const startsAt = new Date(startsAtStr);
	if (Number.isNaN(startsAt.getTime())) {
		return null;
	}

	if (endsAtStr) {
		const endsAt = new Date(endsAtStr);
		if (Number.isNaN(endsAt.getTime())) {
			return null;
		}
		return { startsAt, endsAt };
	}

	return {
		startsAt,
		endsAt: new Date(startsAt.getTime() + DEFAULT_EVENT_DURATION_MS)
	};
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const wrkspace = await getWrkspaceForUser(locals.user!.id, params.teamSlug, params.wrkspaceSlug);

	if (!wrkspace) {
		error(404, 'wrkspace not found');
	}

	const module = await getModuleForUser(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId
	);

	if (!module) {
		error(404, 'Module not found');
	}

	const base = {
		wrkspace,
		module,
		typeLabel: moduleTypeLabel(module.type)
	};

	if (module.type === 'chat') {
		const messages = await listChatMessages(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);
		return { ...base, messages, currentUserId: locals.user!.id };
	}

	if (module.type === 'calendar') {
		const events = await listCalendarEvents(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);
		return { ...base, events };
	}

	if (module.type === 'cards') {
		await ensureCardBoardSeed(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);
		const board = await listCardBoard(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);
		return { ...base, board };
	}

	if (module.type === 'docs') {
		const documents = await listDocPages(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);
		return { ...base, documents };
	}

	if (module.type === 'forum') {
		const pageParam = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
		const q = url.searchParams.get('q')?.trim() ?? '';
		const sort = parseForumThreadSort(url.searchParams.get('sort'));
		const threadsPage = await listForumThreads(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			{
				page: Number.isNaN(pageParam) ? 1 : pageParam,
				q: q || undefined,
				sort
			}
		);
		return { ...base, threadsPage };
	}

	if (module.type === 'tasks') {
		const [tasks, teamMembers, taskModuleSettings, taskDependencies] = await Promise.all([
			listTasks(locals.user!.id, params.teamSlug, params.wrkspaceSlug, params.moduleId),
			listTeamMembersForWrkspace(locals.user!.id, params.teamSlug, params.wrkspaceSlug),
			getTaskModuleSettings(params.moduleId),
			listTaskDependencies(params.moduleId)
		]);
		return { ...base, tasks, teamMembers, taskModuleSettings, taskDependencies };
	}

	return base;
};

export const actions: Actions = {
	updateModuleTitle: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString() ?? '';

		const ok = await updateModuleTitle(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			title
		);

		if (!ok) {
			return fail(400, { message: 'Could not update title' });
		}

		return { success: true };
	},

	sendMessage: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const body = formData.get('body')?.toString() ?? '';
		const files = formData
			.getAll('attachments')
			.filter((entry): entry is File => entry instanceof File);

		const ok = await addChatMessage(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			body,
			files
		);

		if (!ok) {
			return fail(400, { message: 'Could not send message' });
		}

		return { success: true };
	},

	toggleReaction: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const messageId = formData.get('messageId')?.toString() ?? '';
		const emoji = formData.get('emoji')?.toString() ?? '';

		if (!messageId || !emoji) {
			return fail(400, { message: 'Invalid reaction' });
		}

		const ok = await toggleChatReaction(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			messageId,
			emoji
		);

		if (!ok) {
			return fail(400, { message: 'Could not update reaction' });
		}

		return { success: true };
	},

	addEvent: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString() ?? '';
		const description = formData.get('description')?.toString() ?? '';
		const times = parseEventTimesFromForm(formData);

		if (!times) {
			return fail(400, { message: 'Invalid date or time' });
		}

		const ok = await addCalendarEvent(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			{ title, description, startsAt: times.startsAt, endsAt: times.endsAt }
		);

		if (!ok) {
			return fail(400, { message: 'Could not add event' });
		}

		return { success: true };
	},

	updateEvent: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const eventId = formData.get('eventId')?.toString() ?? '';
		const title = formData.get('title')?.toString() ?? '';
		const description = formData.get('description')?.toString() ?? '';
		const times = parseEventTimesFromForm(formData);

		if (!eventId) {
			return fail(400, { message: 'Event is required' });
		}

		if (!times) {
			return fail(400, { message: 'Invalid date or time' });
		}

		const ok = await updateCalendarEvent(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			eventId,
			{ title, description, startsAt: times.startsAt, endsAt: times.endsAt }
		);

		if (!ok) {
			return fail(400, { message: 'Could not update event' });
		}

		return { success: true };
	},

	importIcs: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const file = formData.get('icsFile');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Choose an .ics file to import' });
		}

		if (file.size > MAX_ICS_IMPORT_BYTES) {
			return fail(400, { message: 'ICS file is too large (max 2 MB)' });
		}

		const icsText = await file.text();
		const result = await importCalendarEventsFromIcs(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			icsText
		);

		if (!result) {
			return fail(400, { message: 'Could not import calendar' });
		}

		return {
			success: true,
			icsImport: result
		};
	},

	deleteEvent: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const eventId = formData.get('eventId')?.toString() ?? '';

		if (!eventId) {
			return fail(400, { message: 'Event is required' });
		}

		const ok = await deleteCalendarEvent(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			eventId
		);

		if (!ok) {
			return fail(400, { message: 'Could not delete event' });
		}

		return { success: true };
	},

	addColumn: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString() ?? '';

		const ok = await addCardColumn(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			title
		);

		if (!ok) {
			return fail(400, { message: 'Could not add column' });
		}

		return { success: true };
	},

	addCard: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const columnId = formData.get('columnId')?.toString() ?? '';
		const title = formData.get('title')?.toString() ?? '';
		const body = formData.get('body')?.toString() ?? '';

		if (!columnId) {
			return fail(400, { message: 'Column is required' });
		}

		const ok = await addBoardCard(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			columnId,
			title,
			body
		);

		if (!ok) {
			return fail(400, { message: 'Could not add card' });
		}

		return { success: true };
	},

	moveCard: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const cardId = formData.get('cardId')?.toString() ?? '';
		const columnId = formData.get('columnId')?.toString() ?? '';
		const positionStr = formData.get('position')?.toString() ?? '';
		const position = Number.parseInt(positionStr, 10);

		if (!cardId || !columnId || Number.isNaN(position)) {
			return fail(400, { message: 'Invalid move' });
		}

		const ok = await moveBoardCard(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			cardId,
			columnId,
			position
		);

		if (!ok) {
			return fail(400, { message: 'Could not move card' });
		}

		return { success: true };
	},

	moveColumn: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const columnId = formData.get('columnId')?.toString() ?? '';
		const positionStr = formData.get('position')?.toString() ?? '';
		const position = Number.parseInt(positionStr, 10);

		if (!columnId || Number.isNaN(position)) {
			return fail(400, { message: 'Invalid move' });
		}

		const ok = await moveCardColumn(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			columnId,
			position
		);

		if (!ok) {
			return fail(400, { message: 'Could not move column' });
		}

		return { success: true };
	},

	updateColumn: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const columnId = formData.get('columnId')?.toString() ?? '';
		const title = formData.get('title')?.toString() ?? '';
		const color = formData.get('color')?.toString() ?? '';

		if (!columnId) {
			return fail(400, { message: 'Column is required' });
		}

		const ok = await updateCardColumn(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			columnId,
			{ title, color }
		);

		if (!ok) {
			return fail(400, { message: 'Could not update column' });
		}

		return { success: true };
	},

	updateCard: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const cardId = formData.get('cardId')?.toString() ?? '';
		const title = formData.get('title')?.toString() ?? '';
		const body = formData.get('body')?.toString() ?? '';

		if (!cardId) {
			return fail(400, { message: 'Card is required' });
		}

		const ok = await updateBoardCard(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			cardId,
			{ title, body }
		);

		if (!ok) {
			return fail(400, { message: 'Could not update card' });
		}

		return { success: true };
	},

	deleteCard: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const cardId = formData.get('cardId')?.toString() ?? '';

		if (!cardId) {
			return fail(400, { message: 'Card is required' });
		}

		const ok = await deleteBoardCard(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			cardId
		);

		if (!ok) {
			return fail(400, { message: 'Could not delete card' });
		}

		return { success: true };
	},

	createThread: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString() ?? '';
		const body = formData.get('body')?.toString() ?? '';
		const files = formData
			.getAll('attachments')
			.filter((entry): entry is File => entry instanceof File);

		const threadId = await createForumThread(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			title,
			body,
			files
		);

		if (!threadId) {
			return fail(400, { message: 'Could not create thread' });
		}

		redirect(
			303,
			`/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${params.moduleId}/threads/${threadId}`
		);
	},

	createTask: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const input = parseTaskInputFromForm(formData);
		if (!input) {
			return fail(400, { message: 'Invalid task data' });
		}

		const taskId = await createTask(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			input
		);

		if (!taskId) {
			return fail(400, { message: 'Could not create task' });
		}

		return { success: true };
	},

	updateTask: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId')?.toString() ?? '';
		if (!taskId) {
			return fail(400, { message: 'Task is required' });
		}

		const input = parseTaskInputFromForm(formData);
		if (!input) {
			return fail(400, { message: 'Invalid task data' });
		}

		const ok = await updateTask(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			taskId,
			input
		);

		if (!ok) {
			return fail(400, { message: 'Could not update task' });
		}

		return { success: true };
	},

	deleteTask: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId')?.toString() ?? '';
		if (!taskId) {
			return fail(400, { message: 'Task is required' });
		}

		const ok = await deleteTask(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			taskId
		);

		if (!ok) {
			return fail(400, { message: 'Could not delete task' });
		}

		return { success: true };
	},

	updateTaskSchedule: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId')?.toString() ?? '';
		const startsAtStr = formData.get('startsAt')?.toString() ?? '';
		const dueAtStr = formData.get('dueAt')?.toString() ?? '';

		if (!taskId) {
			return fail(400, { message: 'Task is required' });
		}

		let startsAt: Date | null = null;
		let dueAt: Date | null = null;

		if (startsAtStr) {
			const d = new Date(startsAtStr);
			if (Number.isNaN(d.getTime())) {
				return fail(400, { message: 'Invalid start date' });
			}
			startsAt = d;
		}

		if (dueAtStr) {
			const d = new Date(dueAtStr);
			if (Number.isNaN(d.getTime())) {
				return fail(400, { message: 'Invalid due date' });
			}
			dueAt = d;
		}

		const ok = await updateTaskSchedule(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			taskId,
			startsAt,
			dueAt
		);

		if (!ok) {
			return fail(400, { message: 'Could not update schedule' });
		}

		return { success: true };
	},

	updateTaskModuleSettings: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const settings = parseTaskModuleSettingsFromForm(formData);
		if (!settings) {
			return fail(400, { message: 'Invalid settings' });
		}

		const ok = await updateTaskModuleSettings(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			settings
		);

		if (!ok) {
			return fail(400, { message: 'Could not save settings' });
		}

		return { success: true };
	},

	addTaskDependency: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const fromTaskId = formData.get('fromTaskId')?.toString() ?? '';
		const toTaskId = formData.get('toTaskId')?.toString() ?? '';

		if (!fromTaskId || !toTaskId) {
			return fail(400, { message: 'Tasks are required' });
		}

		const result = await addTaskDependency(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			fromTaskId,
			toTaskId
		);

		if (!result.ok) {
			return fail(400, { message: result.error ?? 'Could not add dependency' });
		}

		return { success: true };
	},

	removeTaskDependency: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const fromTaskId = formData.get('fromTaskId')?.toString() ?? '';
		const toTaskId = formData.get('toTaskId')?.toString() ?? '';

		if (!fromTaskId || !toTaskId) {
			return fail(400, { message: 'Tasks are required' });
		}

		const ok = await removeTaskDependency(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			fromTaskId,
			toTaskId
		);

		if (!ok) {
			return fail(400, { message: 'Could not remove dependency' });
		}

		return { success: true };
	},

	moveTask: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId')?.toString() ?? '';
		const positionStr = formData.get('position')?.toString() ?? '';
		const position = Number.parseInt(positionStr, 10);
		const statusRaw = formData.get('status')?.toString();
		const priorityRaw = formData.get('priority')?.toString();

		if (!taskId || Number.isNaN(position)) {
			return fail(400, { message: 'Invalid move' });
		}

		const updates: { status?: TaskStatus; priority?: TaskPriority } = {};
		if (statusRaw) {
			if (!isTaskStatus(statusRaw)) {
				return fail(400, { message: 'Invalid status' });
			}
			updates.status = statusRaw;
		}
		if (priorityRaw) {
			if (!isTaskPriority(priorityRaw)) {
				return fail(400, { message: 'Invalid priority' });
			}
			updates.priority = priorityRaw;
		}

		const ok = await moveTask(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			taskId,
			position,
			Object.keys(updates).length > 0 ? updates : undefined
		);

		if (!ok) {
			return fail(400, { message: 'Could not move task' });
		}

		return { success: true };
	},

	createDoc: async ({ locals, params }) => {
		const docId = await createDocPage(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);

		if (!docId) {
			return fail(400, { message: 'Could not create document' });
		}

		redirect(
			303,
			`/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${params.moduleId}/docs/${docId}`
		);
	},

	deleteModule: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const moduleId = formData.get('moduleId')?.toString() ?? params.moduleId;

		if (!moduleId) {
			return fail(400, { message: 'Invalid delete request' });
		}

		const ok = await deleteModule(locals.user!.id, params.teamSlug, params.wrkspaceSlug, moduleId);

		if (!ok) {
			return fail(403, { message: 'Could not delete module' });
		}

		redirect(303, `/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}`);
	}
};
