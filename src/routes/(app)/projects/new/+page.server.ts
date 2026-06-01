import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SEED_TEAM } from '$lib/shared/seed';

export const load: PageServerLoad = () => {
	redirect(301, `/teams/${SEED_TEAM.slug}/wrkspaces/new`);
};
