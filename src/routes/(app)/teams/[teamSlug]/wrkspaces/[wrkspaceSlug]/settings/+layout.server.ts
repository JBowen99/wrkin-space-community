import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getWrkspaceAccess, getWrkspaceCapabilitiesForAccess } from '$lib/server/authorization';

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
	const access = await getWrkspaceAccess(locals.user!.id, params.teamSlug, params.wrkspaceSlug);
	if (!access) {
		error(404, 'Wrkspace not found');
	}

	const capabilities = getWrkspaceCapabilitiesForAccess(access);
	const base = `/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/settings`;

	const navItems = [
		{ label: 'General', href: base },
		...(capabilities.manage_members ? [{ label: 'Members', href: `${base}/members` }] : [])
	];

	if (url.pathname.startsWith(`${base}/members`) && !capabilities.manage_members) {
		redirect(303, base);
	}

	return { access, capabilities, navItems, user: locals.user! };
};
