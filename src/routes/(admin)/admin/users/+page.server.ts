import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listAllUsers, resetUserPassword, promoteToAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const { users, total } = await listAllUsers({ page, limit: 25 });

	return {
		users: users.map((u) => ({
			...u,
			createdAt: u.createdAt.toISOString()
		})),
		total,
		page,
		totalPages: Math.ceil(total / 25)
	};
};

export const actions: Actions = {
	resetPassword: async (event) => {
		const formData = await event.request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) return fail(400, { message: 'User ID is required' });

		try {
			const newPassword = await resetUserPassword(userId);
			return { success: true as const, newPassword, userId };
		} catch (err) {
			event.locals.logger.warn({ err, userId }, 'admin password reset failed');
			return fail(500, { message: 'Failed to reset password' });
		}
	},
	promoteToAdmin: async (event) => {
		const formData = await event.request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) return fail(400, { message: 'User ID is required' });

		try {
			await promoteToAdmin(userId);
			return { success: true as const, promotedUserId: userId };
		} catch (err) {
			event.locals.logger.warn({ err, userId }, 'admin promote failed');
			return fail(500, { message: 'Failed to promote user' });
		}
	}
};
