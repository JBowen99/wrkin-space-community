import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	redirect(
		308,
		`/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${params.moduleId}`
	);
};
