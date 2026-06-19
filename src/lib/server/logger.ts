/**
 * Structured logger.
 *
 * One pino instance shared by every server-side caller (SvelteKit hooks,
 * route handlers, the collab server, scripts). JSON-on-stdout in production,
 * pretty-printed when `NODE_ENV !== 'production'` and the `pino-pretty`
 * transport is available.
 *
 * Use child loggers (`logger.child({ req_id, user_id })`) to attach context;
 * SvelteKit hooks expose a request-scoped child as `event.locals.logger`.
 */
import { pino, type Logger, type LoggerOptions } from 'pino';

type Env = NodeJS.ProcessEnv;
type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

const env: Env = typeof process !== 'undefined' ? process.env : ({} as Env);

const isProd = env.NODE_ENV === 'production';

function resolveLevel(): Level {
	const raw = (env.LOG_LEVEL ?? '').toLowerCase().trim();
	const allowed: Level[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
	if ((allowed as string[]).includes(raw)) {
		return raw as Level;
	}
	return isProd ? 'info' : 'debug';
}

const baseOptions: LoggerOptions = {
	level: resolveLevel(),
	base: {
		env: env.NODE_ENV ?? 'development',
		service: env.SERVICE_NAME ?? 'wrkin-space'
	},
	timestamp: pino.stdTimeFunctions.isoTime,
	formatters: {
		level: (label) => ({ level: label })
	},
	redact: {
		paths: [
			'password',
			'*.password',
			'*.*.password',
			'token',
			'*.token',
			'*.*.token',
			'secret',
			'*.secret',
			'*.*.secret',
			'apiKey',
			'*.apiKey',
			'authorization',
			'*.authorization',
			'headers.authorization',
			'headers.cookie',
			'req.headers.authorization',
			'req.headers.cookie',
			'request.headers.authorization',
			'request.headers.cookie',
			'env.BETTER_AUTH_SECRET',
			'env.COLLAB_JWT_SECRET',
			'env.STRIPE_SECRET_KEY',
			'env.STRIPE_WEBHOOK_SECRET',
			'env.S3_SECRET_KEY',
			'env.POSTGRES_PASSWORD',
			'env.MINIO_ROOT_PASSWORD',
			'env.BACKUP_S3_SECRET_KEY',
			'env.BACKUP_ENCRYPTION_PASSPHRASE'
		],
		censor: '[REDACTED]'
	}
};

function createLogger(): Logger {
	if (isProd) {
		return pino(baseOptions);
	}
	try {
		return pino({
			...baseOptions,
			transport: {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'SYS:HH:MM:ss.l',
					ignore: 'pid,hostname,env,service',
					singleLine: false
				}
			}
		});
	} catch {
		return pino(baseOptions);
	}
}

export const logger: Logger = createLogger();

/**
 * Convenience to capture an unexpected error with consistent fields.
 * Use `logger.child(...).error({ err })` directly when you already have
 * structured context.
 */
export function logError(log: Logger, err: unknown, context: Record<string, unknown> = {}): void {
	const error =
		err instanceof Error
			? { name: err.name, message: err.message, stack: err.stack }
			: { message: String(err) };
	log.error({ ...context, err: error }, error.message);
}

export type { Logger };
