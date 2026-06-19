import { createAuth } from './create-auth.ts';

/** Default auth for community edition — no email hooks or verification requirement. */
export const auth = createAuth();

export { createAuth } from './create-auth.ts';
export type { Auth, AuthEmailHooks, AuthEmailHookUser, AuthOptions } from './create-auth.ts';
