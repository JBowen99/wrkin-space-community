import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DEFAULT_SUBSCRIPTION_TIER, isSubscriptionTier } from '../shared/pricing';
import type { TeamRole } from '../shared/roles';
import { parseTeamRole } from '../shared/roles';
import { PlanLimitError, type PlanLimitInfo } from '../shared/plan-limits';
import { db } from './db/index.ts';
import { team, teamInvite, teamMember, user } from './db/schema.ts';
import {
	assertWithinPlanLimits,
	getTeamMembership,
	planLimitFailMessage,
	planLimitToInfo,
	requireTeamCapability
} from './authorization.ts';
import { addTeamMemberDirect } from './team-members.ts';
import { uniqueId } from '../shared/slug';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export type TeamInviteRow = {
	id: string;
	email: string;
	role: TeamRole;
	expiresAt: Date;
	createdAt: Date;
};

export async function listPendingTeamInvites(teamId: string): Promise<TeamInviteRow[]> {
	const rows = await db
		.select({
			id: teamInvite.id,
			email: teamInvite.email,
			role: teamInvite.role,
			expiresAt: teamInvite.expiresAt,
			createdAt: teamInvite.createdAt
		})
		.from(teamInvite)
		.where(
			and(
				eq(teamInvite.teamId, teamId),
				isNull(teamInvite.acceptedAt),
				gt(teamInvite.expiresAt, new Date())
			)
		);

	return rows.map((row) => ({
		...row,
		role: parseTeamRole(row.role)
	}));
}

export type CreateInviteResult =
	| { ok: true; inviteUrl: string }
	| { ok: false; message: string; planLimit?: PlanLimitInfo };

export async function createTeamInvite(
	actorUserId: string,
	teamSlug: string,
	email: string,
	role: TeamRole = 'user'
): Promise<CreateInviteResult> {
	const membership = await getTeamMembership(actorUserId, teamSlug);
	if (!membership) {
		return { ok: false, message: 'Team not found' };
	}

	try {
		requireTeamCapability(membership, 'manage_members');
	} catch {
		return { ok: false, message: 'Forbidden' };
	}

	if (role === 'owner') {
		return { ok: false, message: 'Cannot invite as owner' };
	}

	const normalizedEmail = email.trim().toLowerCase();
	if (!normalizedEmail) {
		return { ok: false, message: 'Email is required' };
	}

	const [existingUser] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, normalizedEmail))
		.limit(1);

	if (existingUser) {
		const [alreadyMember] = await db
			.select({ userId: teamMember.userId })
			.from(teamMember)
			.where(and(eq(teamMember.teamId, membership.teamId), eq(teamMember.userId, existingUser.id)))
			.limit(1);
		if (alreadyMember) {
			return { ok: false, message: 'User is already on this team' };
		}
	}

	try {
		await assertWithinPlanLimits(
			membership.teamId,
			membership.subscriptionTier,
			membership.extraMemberSeats,
			'members',
			1
		);
	} catch (err) {
		if (err instanceof PlanLimitError) {
			return {
				ok: false,
				message: planLimitFailMessage(err),
				planLimit: planLimitToInfo(err)
			};
		}
		throw err;
	}

	const token = randomBytes(32).toString('hex');
	const id = uniqueId();
	const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

	await db.insert(teamInvite).values({
		id,
		teamId: membership.teamId,
		email: normalizedEmail,
		role,
		tokenHash: hashToken(token),
		invitedById: actorUserId,
		expiresAt
	});

	const inviteUrl = `/invite/${token}`;
	return { ok: true, inviteUrl };
}

export async function revokeTeamInvite(
	actorUserId: string,
	teamSlug: string,
	inviteId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
	const membership = await getTeamMembership(actorUserId, teamSlug);
	if (!membership) {
		return { ok: false, message: 'Team not found' };
	}

	try {
		requireTeamCapability(membership, 'manage_members');
	} catch {
		return { ok: false, message: 'Forbidden' };
	}

	await db
		.delete(teamInvite)
		.where(and(eq(teamInvite.id, inviteId), eq(teamInvite.teamId, membership.teamId)));

	return { ok: true };
}

export async function acceptTeamInvite(
	userId: string,
	userEmail: string,
	token: string
): Promise<{ ok: true; teamSlug: string } | { ok: false; message: string }> {
	const tokenHash = hashToken(token.trim());
	const [invite] = await db
		.select({
			id: teamInvite.id,
			teamId: teamInvite.teamId,
			email: teamInvite.email,
			role: teamInvite.role,
			expiresAt: teamInvite.expiresAt,
			acceptedAt: teamInvite.acceptedAt,
			teamSlug: team.slug,
			subscriptionTier: team.subscriptionTier,
			extraMemberSeats: team.extraMemberSeats
		})
		.from(teamInvite)
		.innerJoin(team, eq(teamInvite.teamId, team.id))
		.where(eq(teamInvite.tokenHash, tokenHash))
		.limit(1);

	if (!invite) {
		return { ok: false, message: 'Invalid or expired invite' };
	}

	if (invite.acceptedAt) {
		return { ok: false, message: 'Invite already used' };
	}

	if (invite.expiresAt < new Date()) {
		return { ok: false, message: 'Invite has expired' };
	}

	if (userEmail.trim().toLowerCase() !== invite.email) {
		return { ok: false, message: 'This invite was sent to a different email address' };
	}

	const role = parseTeamRole(invite.role);

	try {
		await addTeamMemberDirect(
			invite.teamId,
			userId,
			role,
			isSubscriptionTier(invite.subscriptionTier)
				? invite.subscriptionTier
				: DEFAULT_SUBSCRIPTION_TIER,
			invite.extraMemberSeats
		);
	} catch (err) {
		if (err instanceof PlanLimitError) {
			return { ok: false, message: planLimitFailMessage(err) };
		}
		throw err;
	}

	await db.update(teamInvite).set({ acceptedAt: new Date() }).where(eq(teamInvite.id, invite.id));

	return { ok: true, teamSlug: invite.teamSlug };
}
