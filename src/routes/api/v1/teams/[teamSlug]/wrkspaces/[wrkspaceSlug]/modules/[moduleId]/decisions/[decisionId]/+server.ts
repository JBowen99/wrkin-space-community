import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { getDecision } from '$lib/server/decisions';

export const GET: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);
	const decision = await getDecision(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.decisionId
	);
	if (!decision) error(404, 'Decision not found');

	return json({
		id: decision.id,
		title: decision.title,
		summary: decision.summary,
		rationale: decision.rationale,
		status: decision.status,
		decidedAt: decision.decidedAt,
		authorName: decision.authorName,
		participants: decision.participants.map((p) => ({ id: p.id, name: p.name })),
		links: decision.links.map((l) => ({
			targetType: l.targetType,
			title: l.title,
			href: l.href
		})),
		createdAt: decision.createdAt,
		updatedAt: decision.updatedAt
	});
};
