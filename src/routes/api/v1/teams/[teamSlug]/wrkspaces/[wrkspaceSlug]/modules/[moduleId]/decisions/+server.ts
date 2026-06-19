import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { listDecisions, createDecision, type DecisionInput } from '$lib/server/decisions';
import { DEFAULT_DECISION_STATUS, isDecisionStatus } from '$lib/shared/decisions';

type CreateDecisionBody = {
	title?: unknown;
	summary?: unknown;
	rationale?: unknown;
	status?: unknown;
	decidedAt?: unknown;
	participantIds?: unknown;
};

export const GET: RequestHandler = async ({ request, params, url }) => {
	const user = await requireApiUser(request);
	const q = url.searchParams.get('q') ?? undefined;
	const page = await listDecisions(user.id, params.teamSlug, params.wrkspaceSlug, params.moduleId, {
		q
	});
	return json(
		page.decisions.map((d) => ({
			id: d.id,
			title: d.title,
			summary: d.summary,
			status: d.status,
			authorName: d.authorName,
			decidedAt: d.decidedAt,
			updatedAt: d.updatedAt
		}))
	);
};

export const POST: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);

	let body: CreateDecisionBody;
	try {
		body = (await request.json()) as CreateDecisionBody;
	} catch {
		error(400, 'Invalid JSON body');
	}

	const title = typeof body.title === 'string' ? body.title.trim() : '';
	if (!title) error(400, 'title is required');

	const status =
		typeof body.status === 'string' && isDecisionStatus(body.status)
			? body.status
			: DEFAULT_DECISION_STATUS;

	const participantIds = Array.isArray(body.participantIds)
		? body.participantIds.filter((id): id is string => typeof id === 'string')
		: [];

	const decidedAt =
		typeof body.decidedAt === 'string' && body.decidedAt ? new Date(body.decidedAt) : null;

	const input: DecisionInput = {
		title,
		summary: typeof body.summary === 'string' ? body.summary : '',
		rationale: typeof body.rationale === 'string' ? body.rationale : '',
		status,
		decidedAt,
		participantIds,
		supersedesId: null,
		links: []
	};

	const id = await createDecision(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		input
	);
	if (!id) error(403, 'Could not create decision');
	return json({ id }, { status: 201 });
};
