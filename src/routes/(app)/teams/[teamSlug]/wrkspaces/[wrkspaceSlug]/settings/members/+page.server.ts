import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { WRKSPACE_ROLES, type WrkspaceRole } from '$lib/shared/roles';
import { getWrkspaceAccess } from '$lib/server/authorization';
import {
	addWrkspaceMember,
	listTeamMembersForWrkspacePicker,
	listWrkspaceMembers,
	removeWrkspaceMember,
	updateWrkspaceMemberRole
} from '$lib/server/wrkspace-members';

export const load: PageServerLoad = async ({ locals, params }) => {
	const access = await getWrkspaceAccess(locals.user!.id, params.teamSlug, params.wrkspaceSlug);
	if (!access) return { members: [], teamPool: [] };

	const [members, teamPool] = await Promise.all([
		listWrkspaceMembers(locals.user!.id, params.teamSlug, params.wrkspaceSlug),
		listTeamMembersForWrkspacePicker(access.teamId)
	]);

	return { members: members ?? [], teamPool };
};

function parseRole(value: string): WrkspaceRole | null {
	return (WRKSPACE_ROLES as readonly string[]).includes(value) ? (value as WrkspaceRole) : null;
}

export const actions: Actions = {
	addMember: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString() ?? '';
		const role = parseRole(formData.get('role')?.toString() ?? 'user') ?? 'user';

		const result = await addWrkspaceMember(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			userId,
			role
		);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true };
	},

	updateRole: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString() ?? '';
		const role = parseRole(formData.get('role')?.toString() ?? '');
		if (!userId || !role) return fail(400, { message: 'Invalid request' });

		const result = await updateWrkspaceMemberRole(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			userId,
			role
		);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true };
	},

	removeMember: async ({ request, locals, params }) => {
		const userId = (await request.formData()).get('userId')?.toString() ?? '';
		const result = await removeWrkspaceMember(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			userId
		);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true };
	}
};
