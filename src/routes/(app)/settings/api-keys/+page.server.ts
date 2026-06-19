import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export type ApiKeySummary = {
	id: string;
	name: string | null;
	start: string | null;
	prefix: string | null;
	enabled: boolean;
	createdAt: string;
	expiresAt: string | null;
	lastRequest: string | null;
};

function toSummary(row: {
	id: string;
	name: string | null;
	start: string | null;
	prefix: string | null;
	enabled: boolean;
	createdAt: Date;
	expiresAt: Date | null;
	lastRequest: Date | null;
}): ApiKeySummary {
	return {
		id: row.id,
		name: row.name,
		start: row.start,
		prefix: row.prefix,
		enabled: row.enabled,
		createdAt: row.createdAt.toISOString(),
		expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
		lastRequest: row.lastRequest ? row.lastRequest.toISOString() : null
	};
}

export const load: PageServerLoad = async ({ request }) => {
	const result = await auth.api.listApiKeys({ headers: request.headers });
	const apiKeys = result.map(toSummary);
	return { apiKeys };
};

export const actions: Actions = {
	createKey: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() || 'Default';

		const created = await auth.api.createApiKey({
			body: {
				name,
				userId: locals.user!.id,
				prefix: 'wks_'
			}
		});

		return {
			created: {
				id: created.id,
				name: created.name,
				key: created.key,
				start: created.start
			}
		};
	},

	revokeKey: async ({ request }) => {
		const formData = await request.formData();
		const keyId = formData.get('keyId')?.toString() ?? '';
		if (!keyId) error(400, 'Missing key id');

		await auth.api.deleteApiKey({ body: { keyId }, headers: request.headers });
		return { revokedId: keyId };
	}
};
