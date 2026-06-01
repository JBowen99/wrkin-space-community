import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	getTeamCapabilities,
	getTeamMembership,
	getWrkspaceAccess,
	getWrkspaceCapabilities
} from '$lib/server/authorization';
import { getModuleForUser } from '$lib/server/modules';
import { ensurePersonalTeam, listTeamsForUser } from '$lib/server/teams';
import { listWrkspacesForTeam } from '$lib/server/wrkspaces';
import {
	countUnreadNotifications,
	listUserNotifications
} from '$lib/server/activity';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	await ensurePersonalTeam(locals.user.id, locals.user.name);

	const teams = await listTeamsForUser(locals.user.id);

	const teamMatch = url.pathname.match(/^\/teams\/([^/]+)/);
	const activeTeamSlug = teamMatch?.[1] ?? teams[0]?.slug ?? null;
	const activeTeam = teams.find((t) => t.slug === activeTeamSlug) ?? teams[0] ?? null;

	const wrkspaceMatch = url.pathname.match(/^\/teams\/[^/]+\/wrkspaces\/([^/]+)/);
	const activeWrkspaceSlug = wrkspaceMatch?.[1] ?? null;

	const wrkspaces =
		activeTeam && url.pathname.startsWith(`/teams/${activeTeam.slug}`)
			? await listWrkspacesForTeam(locals.user.id, activeTeam.slug)
			: [];

	const activeWrkspace =
		activeWrkspaceSlug != null
			? (wrkspaces.find((w) => w.slug === activeWrkspaceSlug) ?? null)
			: null;

	const moduleMatch = url.pathname.match(/^\/teams\/[^/]+\/wrkspaces\/[^/]+\/modules\/([^/]+)/);
	const activeModuleId = moduleMatch?.[1] ?? null;

	let activeModule: { id: string; title: string } | null = null;
	if (activeModuleId && activeTeamSlug && activeWrkspaceSlug) {
		const mod = await getModuleForUser(
			locals.user.id,
			activeTeamSlug,
			activeWrkspaceSlug,
			activeModuleId
		);
		if (mod) {
			activeModule = { id: mod.id, title: mod.title };
		}
	}

	let teamCapabilities: ReturnType<typeof getTeamCapabilities> | null = null;
	let wrkspaceCapabilities: ReturnType<typeof getWrkspaceCapabilities> | null = null;

	if (activeTeamSlug) {
		const membership = await getTeamMembership(locals.user.id, activeTeamSlug);
		if (membership) {
			teamCapabilities = getTeamCapabilities(membership.role);
		}
	}

	if (activeTeamSlug && activeWrkspaceSlug) {
		const access = await getWrkspaceAccess(locals.user.id, activeTeamSlug, activeWrkspaceSlug);
		if (access) {
			wrkspaceCapabilities = getWrkspaceCapabilities(access.effectiveWrkspaceRole);
		}
	}

	const activeWrkspaceId = activeWrkspace?.id ?? null;

	const [notifications, unreadCount, wrkspaceUnreadCount] = await Promise.all([
		listUserNotifications(locals.user.id, { limit: 30 }),
		countUnreadNotifications(locals.user.id),
		activeWrkspaceId
			? countUnreadNotifications(locals.user.id, activeWrkspaceId)
			: Promise.resolve(0)
	]);

	return {
		user: locals.user,
		teams,
		activeTeam,
		wrkspaces,
		activeWrkspace,
		activeWrkspaceSlug,
		activeWrkspaceId,
		activeModule,
		teamCapabilities,
		wrkspaceCapabilities,
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
	};
};
