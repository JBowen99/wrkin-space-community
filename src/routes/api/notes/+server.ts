import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listUserNotes, createUserNote } from '$lib/server/notes';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const notes = await listUserNotes(locals.user.id);
	return json(notes);
};

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const id = await createUserNote(locals.user.id);
	if (!id) {
		error(500, 'Failed to create note');
	}

	return json({ id }, { status: 201 });
};
