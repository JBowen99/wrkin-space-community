import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isAppAdmin } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const admin = await isAppAdmin(locals.user.id);
	if (!admin) {
		redirect(302, '/teams');
	}

	return { user: locals.user };
};
