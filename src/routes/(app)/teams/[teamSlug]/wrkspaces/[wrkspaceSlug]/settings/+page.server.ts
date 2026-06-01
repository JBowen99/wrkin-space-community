import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	deleteWrkspaceForUser,
	getWrkspaceWithDescription,
	updateWrkspaceForUser
} from '$lib/server/wrkspaces';

export const load: PageServerLoad = async ({ locals, params }) => {
	const wrkspace = await getWrkspaceWithDescription(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug
	);
	if (!wrkspace) return { wrkspace: null };
	return { wrkspace };
};

export const actions: Actions = {
	updateWrkspace: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString() ?? '';

		const ok = await updateWrkspaceForUser(locals.user!.id, params.teamSlug, params.wrkspaceSlug, {
			name: name || undefined,
			description
		});
		if (!ok) return fail(403, { message: 'You cannot edit this wrkspace' });
		return { success: true };
	},

	deleteWrkspace: async ({ locals, params }) => {
		const ok = await deleteWrkspaceForUser(locals.user!.id, params.teamSlug, params.wrkspaceSlug);
		if (!ok) return fail(403, { message: 'Only the wrkspace owner can delete it' });

		redirect(303, `/teams/${params.teamSlug}`);
	}
};
