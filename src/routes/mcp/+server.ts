import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createWrkinMcpServer } from '$lib/server/mcp/server';
import { resolveApiUser } from '$lib/server/api/auth';
import { auth } from '$lib/server/auth';

/**
 * DNS-rebinding protection (required by the MCP Streamable HTTP spec): if an
 * `Origin` header is present, it must match the host the app is served from.
 */
function isOriginAllowed(request: Request): boolean {
	const origin = request.headers.get('origin');
	if (!origin) return true;
	try {
		return new URL(origin).host === new URL(request.url).host;
	} catch {
		return false;
	}
}

async function resolveCaller(request: Request) {
	if (!isOriginAllowed(request)) error(403, 'Forbidden origin');
	const user = await resolveApiUser(auth, request);
	if (!user) error(401, 'Unauthorized');
	return user;
}

export const POST: RequestHandler = async ({ request }) => {
	const user = await resolveCaller(request);

	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined
	});
	const server = createWrkinMcpServer(user);
	await server.connect(transport);

	const response = await transport.handleRequest(request);
	response.headers.set('MCP-Protocol-Version', '2025-06-18');
	return response;
};

/** Stateless mode does not offer a server-streamed SSE channel. */
export const GET: RequestHandler = () => {
	error(405, 'Method Not Allowed');
};

/** Stateless mode does not track sessions to terminate. */
export const DELETE: RequestHandler = () => json({ status: 'ok' });
