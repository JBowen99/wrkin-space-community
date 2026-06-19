import { eq } from 'drizzle-orm';
import {
	DEFAULT_CARD_MODULE_LAYOUT,
	DEFAULT_CARD_MODULE_SCHEMA,
	parseCardModuleSettingsJson,
	resolveCardModuleConfig,
	serializeCardModuleSettings,
	validateCardModuleSchema,
	type CardModuleConfig,
	type CardModuleSettingsData
} from '../shared/cards-schema';
import { db } from './db/index.ts';
import { boardCard, cardColumn, cardModuleSettings } from './db/schema.ts';
import { getModuleContext, recordActivity } from './activity.ts';
import { getWrkspaceAccess, requireWrkspaceCapability } from './authorization.ts';

export type CardModuleSettingsRow = CardModuleSettingsData;

async function requireManageModulesAccess(userId: string, teamSlug: string, wrkspaceSlug: string) {
	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;
	try {
		requireWrkspaceCapability(access, 'manage_modules');
	} catch {
		return undefined;
	}
	return {
		wrkspaceId: access.wrkspaceId,
		teamSlug: access.teamSlug,
		wrkspaceSlug: access.wrkspaceSlug,
		access
	};
}

export async function getCardModuleSettings(
	moduleId: string
): Promise<CardModuleSettingsRow | null> {
	const [row] = await db
		.select({
			schema: cardModuleSettings.schema,
			layout: cardModuleSettings.layout
		})
		.from(cardModuleSettings)
		.where(eq(cardModuleSettings.moduleId, moduleId))
		.limit(1);

	if (!row) return null;
	return parseCardModuleSettingsJson(row);
}

export function getCardModuleConfig(settings: CardModuleSettingsRow | null): CardModuleConfig {
	return resolveCardModuleConfig(settings);
}

export async function insertCardModuleSettings(
	moduleId: string,
	data: CardModuleSettingsData
): Promise<void> {
	const serialized = serializeCardModuleSettings(data);
	await db.insert(cardModuleSettings).values({
		moduleId,
		schema: serialized.schema,
		layout: serialized.layout
	});
}

async function migrateExistingCardsToCustomSchema(
	moduleId: string,
	schema: CardModuleSettingsData['schema']
): Promise<void> {
	const hasTitle = schema.fields.some((field) => field.key === 'title');
	const hasBody = schema.fields.some((field) => field.key === 'body');
	if (!hasTitle && !hasBody) return;

	const allCards = await db
		.select({
			id: boardCard.id,
			title: boardCard.title,
			body: boardCard.body
		})
		.from(boardCard)
		.innerJoin(cardColumn, eq(boardCard.columnId, cardColumn.id))
		.where(eq(cardColumn.moduleId, moduleId));

	for (const card of allCards) {
		const values: Record<string, string | number | null> = {};
		for (const field of schema.fields) {
			if (field.key === 'title') values.title = card.title;
			else if (field.key === 'body') values.body = card.body || null;
			else values[field.key] = null;
		}
		await db
			.update(boardCard)
			.set({ fieldValues: JSON.stringify(values) })
			.where(eq(boardCard.id, card.id));
	}
}

export async function updateCardModuleSettings(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	data: CardModuleSettingsData | null
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
	const resolved = await requireManageModulesAccess(userId, teamSlug, wrkspaceSlug);
	if (!resolved) return { ok: false, errors: ['Not authorized'] };

	if (data === null) {
		await db.delete(cardModuleSettings).where(eq(cardModuleSettings.moduleId, moduleId));

		const ctx = await getModuleContext(moduleId);
		if (ctx) {
			await recordActivity({
				wrkspaceId: resolved.wrkspaceId,
				actorUserId: userId,
				type: 'card.schema_updated',
				moduleId,
				moduleType: 'cards',
				targetType: 'module',
				targetId: moduleId,
				metadata: {
					title: 'Default kanban',
					fieldCount: DEFAULT_CARD_MODULE_SCHEMA.fields.length,
					primaryField: DEFAULT_CARD_MODULE_LAYOUT.primaryFieldKey
				}
			});
		}

		return { ok: true };
	}

	const validation = validateCardModuleSchema(data.schema, data.layout);
	if (!validation.ok) {
		return { ok: false, errors: validation.errors };
	}

	const serialized = serializeCardModuleSettings(data);
	const existing = await getCardModuleSettings(moduleId);

	if (existing) {
		await db
			.update(cardModuleSettings)
			.set({
				schema: serialized.schema,
				layout: serialized.layout
			})
			.where(eq(cardModuleSettings.moduleId, moduleId));
	} else {
		await db.insert(cardModuleSettings).values({
			moduleId,
			schema: serialized.schema,
			layout: serialized.layout
		});
		await migrateExistingCardsToCustomSchema(moduleId, data.schema);
	}

	const ctx = await getModuleContext(moduleId);
	if (ctx) {
		await recordActivity({
			wrkspaceId: resolved.wrkspaceId,
			actorUserId: userId,
			type: 'card.schema_updated',
			moduleId,
			moduleType: 'cards',
			targetType: 'module',
			targetId: moduleId,
			metadata: {
				title: ctx.moduleTitle,
				fieldCount: data.schema.fields.length,
				primaryField: data.layout.primaryFieldKey
			}
		});
	}

	return { ok: true };
}

export function parseCardModuleSettingsFromForm(
	formData: FormData
): CardModuleSettingsData | undefined {
	const schemaRaw = formData.get('schema')?.toString() ?? '';
	const layoutRaw = formData.get('layout')?.toString() ?? '';
	if (!schemaRaw || !layoutRaw) return undefined;

	try {
		const schema = JSON.parse(schemaRaw) as CardModuleSettingsData['schema'];
		const layout = JSON.parse(layoutRaw) as CardModuleSettingsData['layout'];
		return { schema, layout };
	} catch {
		return undefined;
	}
}
