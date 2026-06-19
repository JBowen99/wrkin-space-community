import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getWrkspaceForUser } from '$lib/server/wrkspaces';
import { deleteCalendarEvent, getCalendarEvent, updateCalendarEvent } from '$lib/server/modules';
import { getModuleForUser, moduleTypeLabel } from '$lib/server/modules';
import { listBookmarks } from '$lib/server/bookmarks';
import { loadAttachmentsForEvents } from '$lib/server/calendar-attachments';
import { loadInvitationsForEvents } from '$lib/server/calendar-invitations';
import { listTeamMembers } from '$lib/server/team-members';

const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

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

export const load: PageServerLoad = async ({ locals, params }) => {
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

	if (!module || module.type !== 'calendar') {
		error(404, 'Module not found');
	}

	const event = await getCalendarEvent(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.eventId
	);

	if (!event) {
		error(404, 'Event not found');
	}

	const moduleIndexUrl = `/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${params.moduleId}`;

	const bookmarks = await listBookmarks(locals.user!.id, { wrkspaceId: wrkspace.id });
	const bookmarkedIds = bookmarks
		.filter((b) => b.moduleId === params.moduleId)
		.map((b) => b.targetId);

	const [attMap, invMap] = await Promise.all([
		loadAttachmentsForEvents([params.eventId]),
		loadInvitationsForEvents([params.eventId])
	]);

	const teamMembers = await listTeamMembers(wrkspace.teamId);

	return {
		wrkspace,
		module,
		event,
		typeLabel: moduleTypeLabel(module.type),
		moduleIndexUrl,
		bookmarkedIds,
		attachments: attMap.get(params.eventId) ?? [],
		invitations: invMap.get(params.eventId) ?? [],
		teamMembers,
		currentUserId: locals.user!.id
	};
};

export const actions: Actions = {
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
	}
};
