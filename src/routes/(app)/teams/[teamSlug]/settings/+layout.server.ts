import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getTeamCapabilities, getTeamMembership } from '$lib/server/authorization';

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
	const membership = await getTeamMembership(locals.user!.id, params.teamSlug);
	if (!membership) {
		error(404, 'Team not found');
	}

	const capabilities = getTeamCapabilities(membership.role);
	const base = `/teams/${params.teamSlug}/settings`;

	const navItems = [
		{ label: 'General', href: base },
		...(capabilities.manage_members ? [{ label: 'Members', href: `${base}/members` }] : [])
	];

	if (url.pathname.startsWith(`${base}/members`) && !capabilities.manage_members) {
		redirect(303, base);
	}

	return {
		membership,
		capabilities,
		navItems,
		teamSlug: params.teamSlug,
		user: locals.user!
	};
};
