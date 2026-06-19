import type { PageServerLoad } from './$types';
import { listMyTasks } from '$lib/server/tasks';

export const load: PageServerLoad = async ({ locals }) => {
	const { tasks, wrkspaces } = await listMyTasks(locals.user!.id);
	return { tasks, wrkspaces };
};
