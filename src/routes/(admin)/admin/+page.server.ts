import type { PageServerLoad } from './$types';
import { getAdminStats, listAllUsers } from '$lib/server/admin';

export const load: PageServerLoad = async () => {
	const [stats, { users }] = await Promise.all([getAdminStats(), listAllUsers({ limit: 5 })]);

	return {
		stats,
		recentUsers: users.map((u) => ({
			...u,
			createdAt: u.createdAt.toISOString()
		}))
	};
};
