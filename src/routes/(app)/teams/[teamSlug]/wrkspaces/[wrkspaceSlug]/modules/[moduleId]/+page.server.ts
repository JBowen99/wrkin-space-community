import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getWrkspaceAccess, getWrkspaceCapabilitiesForAccess } from '$lib/server/authorization';
import { getWrkspaceForUser } from '$lib/server/wrkspaces';
import {
	addBoardCard,
	addCalendarEvent,
	addCardColumn,
	addChatMessage,
	deleteBoardCard,
	deleteCalendarEvent,
	deleteCardColumn,
	deleteModule,
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
import { parseDefaultCardFromForm } from '$lib/shared/cards-schema';
import {
	parseCardModuleSettingsFromForm,
	updateCardModuleSettings
} from '$lib/server/cards-settings';
import {
	isCardsModuleConfigured,
	parseSetupCardsFromForm,
	setupCardsModule
} from '$lib/server/cards-setup';
import { listCardsPresetOptions } from '$lib/shared/templates';
import { createDocPage } from '$lib/server/docs';
import {
	addUploadAsset,
	createFolder,
	createLinkAsset,
	deleteFolder,
	deleteLibraryAsset,
	deleteLibraryDoc,
	renameFolder,
	setFolderColor,
	listFoldersForMove,
	listLibraryPage,
	listWrkspaceMembersForDocs,
	moveLibraryItem,
	setFolderGrants
} from '$lib/server/docs-library';
import { parseDocsLibrarySort } from '$lib/shared/docs-library';
import { createForumThread, listForumThreads, parseForumThreadSort } from '$lib/server/forum';
import {
	addTaskDependency,
	createTask,
	createTaskComment,
	deleteTask,
	getTaskModuleSettings,
	listLinkableTargets as listTaskLinkableTargets,
	listTaskBacklinks,
	listTaskDependencies,
	listTasks,
	listTeamMembersForWrkspace,
	loadCommentsForTasks,
	moveTask,
	parseTaskInputFromForm,
	parseTaskModuleSettingsFromForm,
	removeTaskDependency,
	resolveTaskFocusRedirect,
	updateTask,
	updateTaskModuleSettings,
	updateTaskSchedule,
	listWrkspaceTagsForUser
} from '$lib/server/tasks';
import {
	isTaskPriority,
	isTaskStatus,
	type TaskPriority,
	type TaskStatus
} from '$lib/shared/tasks';
import {
	listDecisions,
	listDecisionRelations,
	parseDecisionInputFromForm,
	parseDecisionSortFromQuery,
	createDecision,
	updateDecision,
	deleteDecision,
	listLinkableTargets,
	listTeamMembersForDecisions,
	listDecisionsForSupersedesPicker
} from '$lib/server/decisions';
import { parseDecisionStatusFilter } from '$lib/shared/decisions';
import {
	getReportForModule,
	loadReportsModuleViewData,
	updateReport,
	createReport,
	listReportSourceOptions
} from '$lib/server/reports';
import { listReportsModuleTemplates } from '$lib/shared/templates';
import {
	buildReportConfigFromForm,
	parseReportTypeFromForm,
	parseSourceModuleIdsFromForm,
	requiresReportSourceLinks
} from '$lib/shared/reports';
import { listBookmarks } from '$lib/server/bookmarks';
import { loadAttachmentsForEvents } from '$lib/server/calendar-attachments';
import { loadInvitationsForEvents } from '$lib/server/calendar-invitations';

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

	if (module.type === 'okrs') {
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
		const bookmarks = await listBookmarks(locals.user!.id, { wrkspaceId: wrkspace.id });
		const bookmarkedIds = bookmarks
			.filter((b) => b.moduleId === params.moduleId)
			.map((b) => b.targetId);
		return { ...base, messages, currentUserId: locals.user!.id, bookmarkedIds };
	}

	if (module.type === 'calendar') {
		const events = await listCalendarEvents(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);
		const eventIds = events.map((e) => e.id);
		const [invMap, attMap] =
			eventIds.length > 0
				? await Promise.all([
						loadInvitationsForEvents(eventIds),
						loadAttachmentsForEvents(eventIds)
					])
				: [new Map<string, never[]>(), new Map<string, never[]>()];
		const eventInvitations = Object.fromEntries(invMap);
		const eventAttachments = Object.fromEntries(attMap);
		return { ...base, events, eventInvitations, eventAttachments };
	}

	if (module.type === 'cards') {
		const access = await getWrkspaceAccess(locals.user!.id, params.teamSlug, params.wrkspaceSlug);
		const canManageModules = access
			? getWrkspaceCapabilitiesForAccess(access).manage_modules
			: false;
		const cardsConfigured = await isCardsModuleConfigured(params.moduleId);
		const cardsPresetOptions = listCardsPresetOptions();

		if (!cardsConfigured) {
			return {
				...base,
				cardsConfigured: false,
				cardsPresetOptions,
				canManageModules
			};
		}

		const cardIdParam = url.searchParams.get('cardId')?.trim() ?? '';

		const boardResult = await listCardBoard(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);

		const bookmarks = await listBookmarks(locals.user!.id, { wrkspaceId: wrkspace.id });
		const bookmarkedIds = bookmarks
			.filter((b) => b.moduleId === params.moduleId)
			.map((b) => b.targetId);

		return {
			...base,
			cardsConfigured: true,
			board: boardResult.board,
			cardModuleConfig: boardResult.cardModuleConfig,
			canManageModules,
			cardsPresetOptions,
			bookmarkedIds,
			focusCardId: cardIdParam || null
		};
	}

	if (module.type === 'docs') {
		const folderParam = url.searchParams.get('folder')?.trim() ?? '';
		const folderId = folderParam || null;
		const pageParam = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
		const q = url.searchParams.get('q')?.trim() ?? '';
		const sort = parseDocsLibrarySort(url.searchParams.get('sort'));
		const libraryPage = await listLibraryPage(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			{
				folderId,
				page: Number.isNaN(pageParam) ? 1 : pageParam,
				q: q || undefined,
				sort
			}
		);
		if (!libraryPage) {
			error(404, 'folder not found');
		}
		const libraryMembers = await listWrkspaceMembersForDocs(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);
		const moveFolderTree = (await listFoldersForMove(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		)) ?? { canEditRoot: false, folders: [] };
		return { ...base, libraryPage, libraryMembers, moveFolderTree };
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
		const bookmarks = await listBookmarks(locals.user!.id, { wrkspaceId: wrkspace.id });
		const bookmarkedIds = bookmarks
			.filter((b) => b.moduleId === params.moduleId)
			.map((b) => b.targetId);
		return { ...base, threadsPage, bookmarkedIds };
	}

	if (module.type === 'tasks') {
		const focusTaskParam = url.searchParams.get('task')?.trim() ?? '';
		if (focusTaskParam) {
			const resolved = await resolveTaskFocusRedirect(
				locals.user!.id,
				params.teamSlug,
				params.wrkspaceSlug,
				params.moduleId,
				focusTaskParam
			);
			if (!resolved) {
				error(404, 'Task not found');
			}
			if (resolved.moduleId !== params.moduleId) {
				redirect(
					303,
					`/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${resolved.moduleId}?task=${resolved.taskId}`
				);
			}
		}

		const [
			tasks,
			teamMembers,
			taskModuleSettings,
			taskDependencies,
			wrkspaceTags,
			linkableTargets
		] = await Promise.all([
			listTasks(locals.user!.id, params.teamSlug, params.wrkspaceSlug, params.moduleId),
			listTeamMembersForWrkspace(locals.user!.id, params.teamSlug, params.wrkspaceSlug),
			getTaskModuleSettings(params.moduleId),
			listTaskDependencies(params.moduleId),
			listWrkspaceTagsForUser(locals.user!.id, params.teamSlug, params.wrkspaceSlug),
			listTaskLinkableTargets(
				locals.user!.id,
				params.teamSlug,
				params.wrkspaceSlug,
				params.moduleId
			)
		]);

		const taskIds = tasks.map((t) => t.id);
		const commentsMap = await loadCommentsForTasks(taskIds);
		const taskComments: Record<string, import('$lib/server/tasks').TaskCommentRow[]> = {};
		for (const [taskId, comments] of commentsMap) {
			taskComments[taskId] = comments;
		}

		const taskBacklinksEntries = await Promise.all(
			taskIds.map(
				async (taskId) =>
					[taskId, await listTaskBacklinks(taskId, params.teamSlug, params.wrkspaceSlug)] as const
			)
		);
		const taskBacklinks: Record<string, import('$lib/server/tasks').TaskBacklinkRow[]> =
			Object.fromEntries(taskBacklinksEntries);

		const bookmarks = await listBookmarks(locals.user!.id, { wrkspaceId: wrkspace.id });
		const bookmarkedIds = bookmarks
			.filter((b) => b.moduleId === params.moduleId)
			.map((b) => b.targetId);

		return {
			...base,
			tasks,
			teamMembers,
			taskModuleSettings,
			taskDependencies,
			wrkspaceTags,
			linkableTargets,
			focusTaskId: focusTaskParam || null,
			taskComments,
			taskBacklinks,
			bookmarkedIds,
			teamSlug: params.teamSlug,
			wrkspaceSlug: params.wrkspaceSlug
		};
	}

	if (module.type === 'decisions') {
		const pageParam = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
		const q = url.searchParams.get('q')?.trim() ?? '';
		const sort = parseDecisionSortFromQuery(url.searchParams.get('sort'));
		const statusFilter = parseDecisionStatusFilter(url.searchParams.get('status'));
		const focusDecisionId = url.searchParams.get('decision')?.trim() ?? '';

		const [decisionsPage, teamMembers, linkableTargets, supersedesOptions] = await Promise.all([
			listDecisions(locals.user!.id, params.teamSlug, params.wrkspaceSlug, params.moduleId, {
				page: Number.isNaN(pageParam) ? 1 : pageParam,
				q: q || undefined,
				sort,
				status: statusFilter
			}),
			listTeamMembersForDecisions(locals.user!.id, params.teamSlug, params.wrkspaceSlug),
			listLinkableTargets(locals.user!.id, params.teamSlug, params.wrkspaceSlug, params.moduleId),
			listDecisionsForSupersedesPicker(
				locals.user!.id,
				params.teamSlug,
				params.wrkspaceSlug,
				params.moduleId
			)
		]);

		const decisionIds = decisionsPage.decisions.map((d) => d.id);
		const relations = await listDecisionRelations(
			decisionIds,
			params.teamSlug,
			params.wrkspaceSlug
		);

		return {
			...base,
			decisionsPage,
			teamMembers,
			linkableTargets,
			relations,
			supersedesOptions,
			currentUserId: locals.user!.id,
			focusDecisionId: focusDecisionId || null
		};
	}

	if (module.type === 'reports') {
		const [teamMembers, access, report, sourceOptions] = await Promise.all([
			listTeamMembersForWrkspace(locals.user!.id, params.teamSlug, params.wrkspaceSlug),
			getWrkspaceAccess(locals.user!.id, params.teamSlug, params.wrkspaceSlug),
			getReportForModule(locals.user!.id, params.teamSlug, params.wrkspaceSlug, params.moduleId),
			listReportSourceOptions(
				locals.user!.id,
				params.teamSlug,
				params.wrkspaceSlug,
				params.moduleId
			)
		]);

		const canEdit = access ? getWrkspaceCapabilitiesForAccess(access).manage_modules : false;

		const reportTypeOptions = listReportsModuleTemplates().map((template) => ({
			id: template.id,
			reportType: template.reportType,
			name: template.name,
			description: template.description
		}));

		if (!report) {
			return {
				...base,
				report: null,
				sourceOptions: sourceOptions ?? { taskModules: [], calendarModules: [] },
				teamMembers,
				canEdit,
				reportTypeOptions,
				teamSlug: params.teamSlug,
				wrkspaceSlug: params.wrkspaceSlug
			};
		}

		const reportsView = await loadReportsModuleViewData(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);

		return {
			...base,
			...reportsView,
			teamMembers,
			canEdit,
			reportTypeOptions,
			teamSlug: params.teamSlug,
			wrkspaceSlug: params.wrkspaceSlug
		};
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

		if (!columnId) {
			return fail(400, { message: 'Column is required' });
		}

		const fieldValuesRaw = formData.get('fieldValues')?.toString()?.trim();
		let rawValues: Record<string, unknown>;
		if (fieldValuesRaw) {
			try {
				rawValues = JSON.parse(fieldValuesRaw) as Record<string, unknown>;
			} catch {
				return fail(400, { message: 'Invalid field values' });
			}
		} else {
			rawValues = parseDefaultCardFromForm(formData);
		}

		const result = await addBoardCard(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			columnId,
			rawValues
		);

		if (!result.ok) {
			return fail(400, {
				message: result.fieldErrors?.[0]?.message ?? 'Could not add card',
				fieldErrors: result.fieldErrors
			});
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

		if (!cardId) {
			return fail(400, { message: 'Card is required' });
		}

		const fieldValuesRaw = formData.get('fieldValues')?.toString()?.trim();
		let rawValues: Record<string, unknown>;
		if (fieldValuesRaw) {
			try {
				rawValues = JSON.parse(fieldValuesRaw) as Record<string, unknown>;
			} catch {
				return fail(400, { message: 'Invalid field values' });
			}
		} else {
			rawValues = parseDefaultCardFromForm(formData);
		}

		const result = await updateBoardCard(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			cardId,
			rawValues
		);

		if (!result.ok) {
			return fail(400, {
				message: result.fieldErrors?.[0]?.message ?? 'Could not update card',
				fieldErrors: result.fieldErrors
			});
		}

		return { success: true };
	},

	updateCardModuleSettings: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const settings = parseCardModuleSettingsFromForm(formData);
		if (settings === undefined) {
			return fail(400, { message: 'Invalid card field settings' });
		}

		const result = await updateCardModuleSettings(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			settings
		);

		if (!result.ok) {
			return fail(400, { message: result.errors.join(', '), errors: result.errors });
		}

		return { success: true };
	},

	setupCards: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const parsed = parseSetupCardsFromForm(formData);
		if (!parsed) {
			return fail(400, { message: 'Choose a board preset' });
		}

		const module = await getModuleForUser(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);

		if (!module || module.type !== 'cards') {
			return fail(400, { message: 'Module not found' });
		}

		const result = await setupCardsModule(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			parsed.templateId,
			{ includeSampleContent: parsed.includeSampleContent }
		);

		if (!result.ok) {
			return fail(400, { message: result.error });
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

	deleteColumn: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const columnId = formData.get('columnId')?.toString() ?? '';

		if (!columnId) {
			return fail(400, { message: 'Column is required' });
		}

		const ok = await deleteCardColumn(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			columnId
		);

		if (!ok) {
			return fail(400, { message: 'Could not delete column' });
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

	createTaskComment: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId')?.toString() ?? '';
		const body = formData.get('body')?.toString() ?? '';

		if (!taskId) {
			return fail(400, { message: 'Task is required' });
		}

		const commentId = await createTaskComment(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			taskId,
			body
		);

		if (!commentId) {
			return fail(400, { message: 'Could not post comment' });
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

	createDoc: async ({ request, locals, params, url }) => {
		const formData = await request.formData();
		const folderFromForm = formData.get('folderId')?.toString()?.trim() ?? '';
		const folderParam = folderFromForm || url.searchParams.get('folder')?.trim() || '';
		const folderId = folderParam || null;
		const docId = await createDocPage(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			folderId
		);

		if (!docId) {
			return fail(400, { message: 'Could not create document' });
		}

		redirect(
			303,
			`/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${params.moduleId}/docs/${docId}`
		);
	},

	createFolder: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString() ?? '';
		const parentId = formData.get('parentId')?.toString()?.trim() || null;

		const folderId = await createFolder(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			parentId,
			name
		);

		if (!folderId) {
			return fail(400, { message: 'Could not create folder' });
		}

		return { success: true, folderId };
	},

	renameFolder: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const folderId = formData.get('folderId')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';

		const ok = await renameFolder(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			folderId,
			name
		);

		if (!ok) {
			return fail(400, { message: 'Could not rename folder' });
		}

		return { success: true };
	},

	setFolderColor: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const folderId = formData.get('folderId')?.toString() ?? '';
		const colorRaw = formData.get('color')?.toString() ?? '';
		const color = colorRaw.trim() === '' ? null : colorRaw.trim();

		const ok = await setFolderColor(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			folderId,
			color
		);

		if (!ok) {
			return fail(400, { message: 'Could not update folder color' });
		}

		return { success: true };
	},

	createLink: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const url = formData.get('url')?.toString() ?? '';
		const title = formData.get('title')?.toString() ?? '';
		const folderId = formData.get('folderId')?.toString()?.trim() || null;

		const assetId = await createLinkAsset(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			folderId,
			url,
			title || undefined
		);

		if (!assetId) {
			return fail(400, { message: 'Could not add link' });
		}

		return { success: true, assetId };
	},

	uploadAsset: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const file = formData.get('file');
		const folderId = formData.get('folderId')?.toString()?.trim() || null;

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'File is required' });
		}

		try {
			const assetId = await addUploadAsset(
				locals.user!.id,
				params.teamSlug,
				params.wrkspaceSlug,
				params.moduleId,
				folderId,
				file
			);

			if (!assetId) {
				return fail(400, { message: 'Could not upload file' });
			}

			return { success: true, assetId };
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Upload failed';
			return fail(400, { message });
		}
	},

	moveItem: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const itemType = formData.get('itemType')?.toString() ?? '';
		const itemId = formData.get('itemId')?.toString() ?? '';
		const targetFolderRaw = formData.get('targetFolderId')?.toString() ?? '';
		const targetFolderId =
			targetFolderRaw === '' || targetFolderRaw === 'root' ? null : targetFolderRaw;

		if (itemType !== 'folder' && itemType !== 'doc' && itemType !== 'asset') {
			return fail(400, { message: 'Invalid item type' });
		}

		const ok = await moveLibraryItem(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			itemType,
			itemId,
			targetFolderId
		);

		if (!ok) {
			return fail(400, { message: 'Could not move item' });
		}

		return { success: true };
	},

	deleteLibraryItem: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const itemType = formData.get('itemType')?.toString() ?? '';
		const itemId = formData.get('itemId')?.toString() ?? '';
		const force = formData.get('force')?.toString() === 'true';

		if (itemType !== 'doc' && itemType !== 'asset' && itemType !== 'folder') {
			return fail(400, { message: 'Invalid item type' });
		}

		const ok =
			itemType === 'doc'
				? await deleteLibraryDoc(
						locals.user!.id,
						params.teamSlug,
						params.wrkspaceSlug,
						params.moduleId,
						itemId
					)
				: itemType === 'asset'
					? await deleteLibraryAsset(
							locals.user!.id,
							params.teamSlug,
							params.wrkspaceSlug,
							params.moduleId,
							itemId
						)
					: await deleteFolder(
							locals.user!.id,
							params.teamSlug,
							params.wrkspaceSlug,
							params.moduleId,
							itemId,
							force
						);

		if (!ok) {
			if (itemType === 'folder' && !force) {
				return fail(400, { message: 'Folder is not empty', code: 'folder_not_empty' });
			}
			return fail(400, { message: 'Could not delete item' });
		}

		return { success: true };
	},

	updateFolderGrants: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const folderId = formData.get('folderId')?.toString() ?? '';
		const grantsJson = formData.get('grants')?.toString() ?? '[]';
		const ownerRaw = formData.get('ownerUserId')?.toString()?.trim() ?? '';
		const newOwnerUserId = ownerRaw || null;

		let grants: { userId: string; level: 'view' | 'edit' }[] = [];
		try {
			const parsed = JSON.parse(grantsJson) as unknown;
			if (Array.isArray(parsed)) {
				grants = parsed
					.filter(
						(g): g is { userId: string; level: string } =>
							typeof g === 'object' &&
							g !== null &&
							typeof (g as { userId?: string }).userId === 'string' &&
							((g as { level?: string }).level === 'view' ||
								(g as { level?: string }).level === 'edit')
					)
					.map((g) => ({ userId: g.userId, level: g.level as 'view' | 'edit' }));
			}
		} catch {
			return fail(400, { message: 'Invalid grants payload' });
		}

		const ok = await setFolderGrants(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			folderId,
			grants,
			newOwnerUserId
		);

		if (!ok) {
			return fail(400, { message: 'Could not update sharing' });
		}

		return { success: true };
	},

	createDecision: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const input = parseDecisionInputFromForm(formData);
		if (!input) return fail(400, { message: 'Invalid decision data' });

		const decisionId = await createDecision(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			input
		);

		if (!decisionId) return fail(400, { message: 'Could not create decision' });

		return { success: true };
	},

	updateDecision: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const decisionId = formData.get('decisionId')?.toString() ?? '';
		if (!decisionId) return fail(400, { message: 'Decision is required' });

		const input = parseDecisionInputFromForm(formData);
		if (!input) return fail(400, { message: 'Invalid decision data' });

		const result = await updateDecision(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			decisionId,
			input
		);

		if (!result.ok) return fail(400, { message: 'Could not update decision' });
		return { success: true };
	},

	deleteDecision: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const decisionId = formData.get('decisionId')?.toString() ?? '';
		if (!decisionId) return fail(400, { message: 'Decision is required' });

		const ok = await deleteDecision(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			decisionId
		);

		if (!ok) return fail(400, { message: 'Could not delete decision' });
		return { success: true };
	},

	updateReport: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const reportId = formData.get('reportId')?.toString() ?? '';
		const sourceModuleIds = parseSourceModuleIdsFromForm(formData);

		const module = await getModuleForUser(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);

		if (!module || module.type !== 'reports') {
			return fail(400, { message: 'Module not found' });
		}

		const existing = await getReportForModule(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);

		if (!existing || existing.id !== reportId) {
			return fail(400, { message: 'Report not found' });
		}

		if (requiresReportSourceLinks(existing.type) && sourceModuleIds.length === 0) {
			return fail(400, { message: 'Select at least one linked module' });
		}

		const config = buildReportConfigFromForm(existing.type, formData, {
			userId: locals.user!.id
		});

		const ok = await updateReport(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			reportId,
			{ title: module.title, sourceModuleIds, config }
		);

		if (!ok) return fail(400, { message: 'Could not update report' });
		return { success: true };
	},

	setupReport: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const reportType = parseReportTypeFromForm(formData);
		if (!reportType) {
			return fail(400, { message: 'Choose a report type' });
		}

		const module = await getModuleForUser(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);

		if (!module || module.type !== 'reports') {
			return fail(400, { message: 'Module not found' });
		}

		const existing = await getReportForModule(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId
		);

		if (existing) {
			return fail(400, { message: 'Report is already configured' });
		}

		const sourceModuleIds = parseSourceModuleIdsFromForm(formData);
		if (requiresReportSourceLinks(reportType) && sourceModuleIds.length === 0) {
			return fail(400, { message: 'Select at least one linked module' });
		}

		const config = buildReportConfigFromForm(reportType, formData, {
			userId: locals.user!.id
		});

		const reportId = await createReport(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			{
				type: reportType,
				title: module.title,
				sourceModuleIds,
				config
			}
		);

		if (!reportId) return fail(400, { message: 'Could not set up report' });
		return { success: true };
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
