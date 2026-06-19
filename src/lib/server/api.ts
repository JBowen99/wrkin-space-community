import { error } from '@sveltejs/kit';
import { resolveApiUser, type ApiUser } from './api/auth';
import { auth } from './auth';

/** Resolves the caller from a `Bearer` API key, or throws a 401 SvelteKit error. */
export async function requireApiUser(request: Request): Promise<ApiUser> {
	const user = await resolveApiUser(auth, request);
	if (!user) error(401, 'Unauthorized');
	return user;
}
