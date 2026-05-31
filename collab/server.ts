import 'dotenv/config';
import { createServer as createHttpServer } from 'node:http';
import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { logger, logError } from '../src/lib/server/logger';
import { getCollabJwtSecretFromEnv, verifyCollabToken } from '../src/lib/server/collab-jwt';
import { parseDocIdFromDocumentName } from '../src/lib/shared/doc-editor';
import { clearYjsState, loadYjsState, storeYjsState } from '../src/lib/server/doc-persistence';
import { recordDocEditedActivity } from '../src/lib/server/activity';

const log = logger.child({ component: 'collab' });

const port = Number(process.env.HOCUSPOCUS_PORT ?? 1234);
const healthPort = Number(process.env.COLLAB_HEALTH_PORT ?? 1235);
const jwtSecret = getCollabJwtSecretFromEnv();
const startedAt = new Date();

const server = new Server({
	port,

	async onAuthenticate({ token, documentName }) {
		if (!token) {
			log.warn({ document: documentName }, 'auth_missing_token');
			throw new Error('Unauthorized');
		}

		const payload = await verifyCollabToken(jwtSecret, token);
		if (!payload) {
			log.warn({ document: documentName }, 'auth_invalid_token');
			throw new Error('Unauthorized');
		}

		const docId = parseDocIdFromDocumentName(documentName);
		if (!docId || docId !== payload.docId) {
			log.warn(
				{ document: documentName, doc_id: docId, payload_doc_id: payload.docId },
				'auth_doc_mismatch'
			);
			throw new Error('Unauthorized');
		}

		log.debug({ doc_id: docId, user_id: payload.userId }, 'auth_ok');

		return {
			user: {
				id: payload.userId
			}
		};
	},

	async onLoadDocument({ document, documentName }) {
		const docId = parseDocIdFromDocumentName(documentName);
		if (!docId) return;

		const state = await loadYjsState(docId);
		if (!state) {
			log.debug({ doc_id: docId }, 'load_empty');
			return;
		}

		try {
			Y.applyUpdate(document, state);
			log.debug({ doc_id: docId, bytes: state.byteLength }, 'load_ok');
		} catch (err) {
			logError(log, err, { doc_id: docId, action: 'load_invalid_state' });
			await clearYjsState(docId);
		}
	},

	async onStoreDocument({ document, documentName, context }) {
		const docId = parseDocIdFromDocumentName(documentName);
		if (!docId) return;

		try {
			const state = Y.encodeStateAsUpdate(document);
			await storeYjsState(docId, state);
			log.debug({ doc_id: docId, bytes: state.byteLength }, 'store_ok');

			const actorUserId = context?.user?.id;
			if (typeof actorUserId === 'string') {
				void recordDocEditedActivity(docId, actorUserId).catch((err) => {
					logError(log, err, { doc_id: docId, action: 'activity_record_failed' });
				});
			}
		} catch (err) {
			logError(log, err, { doc_id: docId, action: 'store_failed' });
			throw err;
		}
	}
});

const healthServer = createHttpServer((req, res) => {
	if (!req.url) {
		res.writeHead(404).end();
		return;
	}
	const url = new URL(req.url, `http://localhost:${healthPort}`);
	if (url.pathname === '/health' || url.pathname === '/api/health') {
		const body = JSON.stringify({
			status: 'ok',
			service: 'wrkin-collab',
			uptime_s: Math.round((Date.now() - startedAt.getTime()) / 1000),
			started_at: startedAt.toISOString(),
			version: process.env.BUILD_VERSION ?? 'dev',
			commit: process.env.BUILD_COMMIT ?? 'unknown'
		});
		res
			.writeHead(200, {
				'content-type': 'application/json',
				'cache-control': 'no-store'
			})
			.end(body);
		return;
	}
	res.writeHead(404).end();
});

server.listen();
healthServer.listen(healthPort, () => {
	log.info({ port, health_port: healthPort }, 'collab_listening');
});

healthServer.on('error', (err) => {
	logError(log, err, { health_port: healthPort });
});

function shutdown(signal: string) {
	log.info({ signal }, 'collab_shutting_down');
	healthServer.close();
	void server.destroy().finally(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
