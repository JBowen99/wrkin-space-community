import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { acceptTeamInvite } from '$lib/server/invites';

export const load: PageServerLoad = async ({ params }) => {
	return { token: params.token };
};

export const actions: Actions = {
	accept: async ({ locals, params }) => {
		if (!locals.user?.email) {
			return fail(401, { message: 'Sign in to accept this invite' });
		}

		const result = await acceptTeamInvite(locals.user.id, locals.user.email, params.token);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		redirect(303, `/teams/${result.teamSlug}`);
	}
};
