import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { TEAM_ROLES, type TeamRole } from '$lib/shared/roles';
import {
	countTeamMembers,
	countTeamWrkspaces,
	getTeamMembership,
	maxMembersForTeam
} from '$lib/server/authorization';
import { createTeamInvite, listPendingTeamInvites, revokeTeamInvite } from '$lib/server/invites';
import {
	listTeamMembers,
	removeTeamMember,
	transferTeamOwnership,
	updateTeamMemberRole
} from '$lib/server/team-members';
import { getPlanLimits } from '$lib/shared/plan-limits';
import { getCommunityEffectiveTier } from '$lib/plan';

export const load: PageServerLoad = async ({ locals, params }) => {
	const membership = await getTeamMembership(locals.user!.id, params.teamSlug);
	if (!membership) return { members: [], invites: [], usage: null };

	const [members, invites, memberCount, wrkspaceCount] = await Promise.all([
		listTeamMembers(membership.teamId),
		listPendingTeamInvites(membership.teamId),
		countTeamMembers(membership.teamId),
		countTeamWrkspaces(membership.teamId)
	]);

	const effectiveTier = getCommunityEffectiveTier(membership.subscriptionTier);
	const limits = getPlanLimits(effectiveTier);
	const maxMembers = maxMembersForTeam(effectiveTier, membership.extraMemberSeats);

	return {
		members,
		invites,
		usage: {
			members: memberCount,
			maxMembers,
			wrkspaces: wrkspaceCount,
			maxWrkspaces: limits.maxWrkspaces,
			allowsInvites: limits.allowsInvites
		}
	};
};

function parseRole(value: string): TeamRole | null {
	return (TEAM_ROLES as readonly string[]).includes(value) ? (value as TeamRole) : null;
}

export const actions: Actions = {
	invite: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const role = parseRole(formData.get('role')?.toString() ?? 'user') ?? 'user';

		const result = await createTeamInvite(locals.user!.id, params.teamSlug, email, role);
		if (!result.ok) {
			return fail(400, {
				message: result.message,
				planLimit: result.planLimit ?? null
			});
		}

		return { success: true, inviteUrl: result.inviteUrl };
	},

	revokeInvite: async ({ request, locals, params }) => {
		const inviteId = (await request.formData()).get('inviteId')?.toString() ?? '';
		const result = await revokeTeamInvite(locals.user!.id, params.teamSlug, inviteId);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true };
	},

	updateRole: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString() ?? '';
		const role = parseRole(formData.get('role')?.toString() ?? '');
		if (!userId || !role) return fail(400, { message: 'Invalid request' });

		const result = await updateTeamMemberRole(locals.user!.id, params.teamSlug, userId, role);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true };
	},

	removeMember: async ({ request, locals, params }) => {
		const userId = (await request.formData()).get('userId')?.toString() ?? '';
		const result = await removeTeamMember(locals.user!.id, params.teamSlug, userId);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true };
	},

	transferOwnership: async ({ request, locals, params }) => {
		const userId = (await request.formData()).get('userId')?.toString() ?? '';
		const result = await transferTeamOwnership(locals.user!.id, params.teamSlug, userId);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true };
	}
};
