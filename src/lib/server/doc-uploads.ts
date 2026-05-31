import { eq } from 'drizzle-orm';
import { db } from './db';
import { docPage, wrkspaceModule } from './db/schema';
import { getSubscriptionTierForWrkspaceId } from './authorization';
import { formatUploadLimit, getPlanLimits } from '$lib/shared/plan-limits';
import { DEFAULT_SUBSCRIPTION_TIER } from '$lib/shared/pricing';
import { docImageKey, getObject, putObject } from './storage';

export const DOC_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

async function maxUploadForDoc(docId: string): Promise<number> {
	const [row] = await db
		.select({ wrkspaceId: wrkspaceModule.wrkspaceId })
		.from(docPage)
		.innerJoin(wrkspaceModule, eq(docPage.moduleId, wrkspaceModule.id))
		.where(eq(docPage.id, docId))
		.limit(1);
	if (!row) return getPlanLimits(DEFAULT_SUBSCRIPTION_TIER).maxUploadBytes;
	const tier = await getSubscriptionTierForWrkspaceId(row.wrkspaceId);
	return getPlanLimits(tier ?? DEFAULT_SUBSCRIPTION_TIER).maxUploadBytes;
}

const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp'
};

const EXT_TO_MIME: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp'
};

export function docImagePublicUrl(docId: string, filename: string): string {
	return `/api/docs/images/${encodeURIComponent(docId)}/${encodeURIComponent(filename)}`;
}

function assertSafeDocId(docId: string): void {
	if (!/^[a-zA-Z0-9_-]+$/.test(docId)) {
		throw new Error('Invalid doc id');
	}
}

function assertSafeFilename(filename: string): void {
	if (!filename || filename.includes('..') || /[/\\]/.test(filename)) {
		throw new Error('Invalid filename');
	}
	if (!/^[a-f0-9-]+\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
		throw new Error('Invalid filename');
	}
}

export async function saveDocImage(
	docId: string,
	file: File
): Promise<{ filename: string; url: string }> {
	assertSafeDocId(docId);

	if (!MIME_TO_EXT[file.type]) {
		throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
	}
	const maxBytes = await maxUploadForDoc(docId);
	if (file.size > maxBytes) {
		throw new Error(`Image must be ${formatUploadLimit(maxBytes)} or smaller`);
	}

	const ext = MIME_TO_EXT[file.type];
	const filename = `${crypto.randomUUID()}${ext}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	await putObject(docImageKey(docId, filename), buffer, file.type);

	return { filename, url: docImagePublicUrl(docId, filename) };
}

export async function readDocImage(
	docId: string,
	filename: string
): Promise<{ body: Buffer; contentType: string }> {
	assertSafeDocId(docId);
	assertSafeFilename(filename);

	const { body, contentType } = await getObject(docImageKey(docId, filename));
	const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
	return { body, contentType: EXT_TO_MIME[ext] ?? contentType };
}
