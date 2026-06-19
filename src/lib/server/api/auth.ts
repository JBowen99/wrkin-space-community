import { eq } from 'drizzle-orm';
import type { Auth } from '../create-auth.ts';
import { db } from '../db/index.ts';
import { user } from '../db/schema.ts';

export type ApiUser = {
	id: string;
	name: string;
	email: string;
	image: string | null;
};

/** Reads a bearer token from the `Authorization` header. */
export function extractBearerToken(request: Request): string | null {
	const header = request.headers.get('authorization');
	if (!header) return null;
	const trimmed = header.trim();
	const match = /^Bearer\s+(.+)$/i.exec(trimmed);
	const token = match?.[1]?.trim();
	return token || null;
}

/**
 * Resolves the user behind a `Bearer <api-key>` request via the Better Auth
 * API-key plugin. Returns `null` when there is no key, the key is invalid,
 * or the owning user no longer exists. Used by the public REST API and the
 * MCP server; downstream server functions authorize using the returned id.
 */
export async function resolveApiUser(auth: Auth, request: Request): Promise<ApiUser | null> {
	const token = extractBearerToken(request);
	if (!token) return null;

	try {
		const result = await auth.api.verifyApiKey({ body: { key: token } });
		if (!result.valid || !result.key) return null;

		const [row] = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image
			})
			.from(user)
			.where(eq(user.id, result.key.userId))
			.limit(1);

		return row ?? null;
	} catch {
		return null;
	}
}
