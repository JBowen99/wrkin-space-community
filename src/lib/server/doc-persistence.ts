import { eq } from 'drizzle-orm';
import { createDb } from './db/connection';
import { docPage } from './db/schema';
import { extractPreviewText } from './doc-editor';

let collabDb: ReturnType<typeof createDb> | undefined;

function getDb() {
	if (!collabDb) {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL is not set');
		collabDb = createDb(url);
	}
	return collabDb;
}

export async function loadYjsState(docId: string): Promise<Uint8Array | null> {
	const rows = await getDb()
		.select({ yjsState: docPage.yjsState })
		.from(docPage)
		.where(eq(docPage.id, docId))
		.limit(1);

	const state = rows[0]?.yjsState;
	if (!state || state.length === 0) return null;
	return state;
}

/** Clear corrupt or legacy-encoded document state so the editor can start fresh. */
export async function clearYjsState(docId: string): Promise<void> {
	await getDb()
		.update(docPage)
		.set({ yjsState: null, previewText: '', updatedAt: new Date() })
		.where(eq(docPage.id, docId));
}

export async function storeYjsState(
	docId: string,
	state: Uint8Array,
	previewText?: string
): Promise<void> {
	const excerpt = previewText ?? extractPreviewText(state);
	await getDb()
		.update(docPage)
		.set({
			yjsState: state,
			previewText: excerpt,
			updatedAt: new Date()
		})
		.where(eq(docPage.id, docId));
}
