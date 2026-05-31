import * as jose from 'jose';

const ISSUER = 'wrkin-space-collab';
const TTL = '5m';

export function resolveCollabJwtSecret(sources: {
	collabJwtSecret?: string | null;
	betterAuthSecret?: string | null;
}): string | undefined {
	const secret = sources.collabJwtSecret?.trim() || sources.betterAuthSecret?.trim();
	return secret || undefined;
}

export function getCollabJwtSecretFromEnv(): string {
	const secret = resolveCollabJwtSecret({
		collabJwtSecret: process.env.COLLAB_JWT_SECRET,
		betterAuthSecret: process.env.BETTER_AUTH_SECRET
	});
	if (!secret) {
		throw new Error('COLLAB_JWT_SECRET or BETTER_AUTH_SECRET must be set');
	}
	return secret;
}

export async function signCollabToken(
	secret: string,
	userId: string,
	docId: string
): Promise<string> {
	const key = new TextEncoder().encode(secret);
	return new jose.SignJWT({ docId })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(userId)
		.setIssuer(ISSUER)
		.setExpirationTime(TTL)
		.setIssuedAt()
		.sign(key);
}

export async function verifyCollabToken(
	secret: string,
	token: string
): Promise<{ userId: string; docId: string } | null> {
	try {
		const key = new TextEncoder().encode(secret);
		const { payload } = await jose.jwtVerify(token, key, { issuer: ISSUER });
		const userId = payload.sub;
		const docId = typeof payload.docId === 'string' ? payload.docId : null;
		if (!userId || !docId) return null;
		return { userId, docId };
	} catch {
		return null;
	}
}
