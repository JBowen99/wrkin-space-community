import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { resolveCollabJwtSecret, signCollabToken } from '$lib/server/collab-jwt';
import { userCanEditDoc } from '$lib/server/docs';
import { hocuspocusDocumentName } from '$lib/shared/doc-editor';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const docId = url.searchParams.get('docId')?.trim() ?? '';
	if (!docId) {
		error(400, 'docId is required');
	}

	const allowed = await userCanEditDoc(locals.user.id, docId);
	if (!allowed) {
		error(403, 'Forbidden');
	}

	const wsUrl = publicEnv.PUBLIC_COLLAB_WS_URL;
	if (!wsUrl) {
		error(503, 'Collaboration server is not configured');
	}

	const jwtSecret = resolveCollabJwtSecret({
		collabJwtSecret: privateEnv.COLLAB_JWT_SECRET,
		betterAuthSecret: privateEnv.BETTER_AUTH_SECRET
	});
	if (!jwtSecret) {
		error(503, 'Collaboration is not configured (missing JWT secret)');
	}

	const token = await signCollabToken(jwtSecret, locals.user.id, docId);

	return json({
		token,
		url: wsUrl,
		documentName: hocuspocusDocumentName(docId)
	});
};
