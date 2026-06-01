import { json, type RequestHandler } from '@sveltejs/kit';
import { getBuildInfo, getUptimeSeconds } from '$lib/server/build-info';

/**
 * Liveness probe.
 *
 * Dependency-free, intentionally cheap: returns 200 as long as the Node
 * process can serve a request. Used by the Docker healthcheck and external
 * uptime monitors. For dependency status, see `/api/health/ready`.
 */
export const GET: RequestHandler = () => {
	const build = getBuildInfo();
	return json(
		{
			status: 'ok',
			service: 'wrkin-space',
			uptime_s: getUptimeSeconds(),
			...build
		},
		{
			headers: {
				'cache-control': 'no-store'
			}
		}
	);
};
