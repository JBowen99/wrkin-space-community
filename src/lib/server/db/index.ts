import { env } from '$env/dynamic/private';
import { createDb, type Database } from './connection';

let dbInstance: Database | undefined;

function getDbInstance(): Database {
	if (!dbInstance) {
		const url = env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL is not set');
		dbInstance = createDb(url);
	}
	return dbInstance;
}

/** Lazy Drizzle client — defers connecting until first query (build/analyse must not require a live DB). */
export const db: Database = new Proxy({} as Database, {
	get(_target, prop) {
		const instance = getDbInstance();
		const value = Reflect.get(instance as object, prop, instance);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});
