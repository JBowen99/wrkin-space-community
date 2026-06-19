import { asc, desc, eq } from 'drizzle-orm';
import { db } from './db/index.ts';
import { userNote } from './db/schema.ts';
import { uniqueId } from '../shared/slug';

export type UserNoteRow = {
	id: string;
	title: string;
	content: string;
	updatedAt: string;
};

function toRow(row: typeof userNote.$inferSelect): UserNoteRow {
	return {
		id: row.id,
		title: row.title,
		content: row.content,
		updatedAt: row.updatedAt.toISOString()
	};
}

export async function listUserNotes(userId: string): Promise<UserNoteRow[]> {
	const rows = await db
		.select()
		.from(userNote)
		.where(eq(userNote.userId, userId))
		.orderBy(asc(userNote.createdAt), asc(userNote.position));

	return rows.map(toRow);
}

export async function createUserNote(userId: string): Promise<string | undefined> {
	const [maxPos] = await db
		.select({ max: userNote.position })
		.from(userNote)
		.where(eq(userNote.userId, userId))
		.orderBy(desc(userNote.position))
		.limit(1);

	const id = uniqueId();
	const now = new Date();

	await db.insert(userNote).values({
		id,
		userId,
		title: 'Untitled Note',
		content: '',
		position: (maxPos?.max ?? -1) + 1,
		createdAt: now,
		updatedAt: now
	});

	return id;
}

export async function updateUserNote(
	userId: string,
	noteId: string,
	data: { title?: string; content?: string }
): Promise<UserNoteRow | undefined> {
	const existing = await db.select().from(userNote).where(eq(userNote.id, noteId)).limit(1);

	const row = existing[0];
	if (!row || row.userId !== userId) return undefined;

	const updates: Partial<typeof userNote.$inferInsert> = { updatedAt: new Date() };
	if (data.title !== undefined) updates.title = data.title.trim() || 'Untitled Note';
	if (data.content !== undefined) updates.content = data.content;

	const updated = await db.update(userNote).set(updates).where(eq(userNote.id, noteId)).returning();

	const result = updated[0];
	if (!result) return undefined;

	return toRow(result);
}

export async function deleteUserNote(userId: string, noteId: string): Promise<boolean> {
	const existing = await db
		.select({ userId: userNote.userId })
		.from(userNote)
		.where(eq(userNote.id, noteId))
		.limit(1);

	const row = existing[0];
	if (!row || row.userId !== userId) return false;

	await db.delete(userNote).where(eq(userNote.id, noteId));
	return true;
}
