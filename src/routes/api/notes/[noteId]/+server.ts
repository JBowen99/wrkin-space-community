import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateUserNote, deleteUserNote } from '$lib/server/notes';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const body = (await request.json()) as { title?: string; content?: string };
	const note = await updateUserNote(locals.user.id, params.noteId, body);
	if (!note) {
		error(404, 'Note not found');
	}

	return json(note);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const deleted = await deleteUserNote(locals.user.id, params.noteId);
	if (!deleted) {
		error(404, 'Note not found');
	}

	return json({ ok: true });
};
