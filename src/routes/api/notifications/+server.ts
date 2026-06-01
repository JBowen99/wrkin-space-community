import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	countUnreadNotifications,
	listUserNotifications,
	markAllNotificationsRead,
	markNotificationRead
} from '$lib/server/activity';
import { getWrkspaceAccess } from '$lib/server/authorization';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const wrkspaceScope = url.searchParams.get('wrkspaceId');
	const teamSlug = url.searchParams.get('teamSlug');
	const wrkspaceSlug = url.searchParams.get('wrkspaceSlug');

	let wrkspaceId: string | null = null;
	if (wrkspaceScope === 'current' && teamSlug && wrkspaceSlug) {
		const access = await getWrkspaceAccess(locals.user.id, teamSlug, wrkspaceSlug);
		wrkspaceId = access?.wrkspaceId ?? null;
	}

	const [notifications, unreadCount, wrkspaceUnreadCount] = await Promise.all([
		listUserNotifications(locals.user.id, { limit: 30, wrkspaceId }),
		countUnreadNotifications(locals.user.id),
		wrkspaceId ? countUnreadNotifications(locals.user.id, wrkspaceId) : Promise.resolve(0)
	]);

	return json({
		notifications: notifications.map((n) => ({
			...n,
			createdAt: n.createdAt.toISOString(),
			readAt: n.readAt?.toISOString() ?? null,
			event: {
				...n.event,
				createdAt: n.event.createdAt.toISOString()
			}
		})),
		unreadCount,
		wrkspaceUnreadCount
	});
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as {
		action?: 'markRead' | 'markAllRead';
		notificationId?: string;
		wrkspaceId?: string | null;
	};

	if (body.action === 'markRead' && body.notificationId) {
		const ok = await markNotificationRead(locals.user.id, body.notificationId);
		return json({ ok });
	}

	if (body.action === 'markAllRead') {
		const count = await markAllNotificationsRead(locals.user.id, body.wrkspaceId ?? null);
		return json({ ok: true, count });
	}

	return json({ error: 'Invalid request' }, { status: 400 });
};
