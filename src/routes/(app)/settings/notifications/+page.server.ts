import type { Actions, PageServerLoad } from './$types';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CATEGORY_LABELS } from '$lib/shared/activity';
import {
	listNotificationPreferences,
	updateNotificationPreferences
} from '$lib/server/activity';

export const load: PageServerLoad = async ({ locals }) => {
	const preferences = await listNotificationPreferences(locals.user!.id);
	return {
		preferences,
		labels: NOTIFICATION_CATEGORY_LABELS
	};
};

export const actions: Actions = {
	updatePreferences: async ({ request, locals }) => {
		const formData = await request.formData();
		const updates = NOTIFICATION_CATEGORIES.map((category) => ({
			category,
			enabled: formData.get(`category:${category}`) === 'on'
		}));

		await updateNotificationPreferences(locals.user!.id, updates);
		return { success: true };
	}
};
