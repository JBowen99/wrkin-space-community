import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SEED_TEAM } from '$lib/shared/seed';

/** Legacy project URLs → wrkspace dashboard (seed slugs match old project ids). */
export const load: PageServerLoad = ({ params }) => {
	redirect(301, `/teams/${SEED_TEAM.slug}/wrkspaces/${params.id}`);
};
