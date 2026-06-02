/**
 * Build identity exposed by /api/health.
 *
 * `BUILD_VERSION` and `BUILD_COMMIT` are baked into the runtime environment
 * at deploy time (see compose.prod.yaml). When unset (e.g. local dev) we
 * fall back to the process start time so each restart is still
 * distinguishable.
 */
const STARTED_AT = new Date();

export function getBuildInfo() {
	return {
		version: process.env.BUILD_VERSION ?? 'dev',
		commit: process.env.BUILD_COMMIT ?? 'unknown',
		started_at: STARTED_AT.toISOString()
	};
}

export function getUptimeSeconds(): number {
	return Math.round((Date.now() - STARTED_AT.getTime()) / 1000);
}
