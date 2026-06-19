import { and, count, eq } from 'drizzle-orm';
import {
	assertModuleTypeAllowed,
	PLAN_LIMITS,
	PlanLimitError,
	type PlanLimitInfo
} from '../shared/plan-limits';
import type { SubscriptionTier } from '../shared/pricing';
import {
	BLANK_WRKSPACE_TEMPLATE_ID,
	getCardsModuleTemplate,
	getReportsModuleTemplate,
	getWrkspaceTemplate,
	listCardsModuleTemplates,
	listReportsModuleTemplates,
	listWrkspaceTemplates,
	type CardsModuleTemplate,
	type ReportsModuleTemplate,
	type TasksModuleContent,
	type WrkspaceTemplate,
	type WrkspaceTemplateModule
} from '../shared/templates';
import type { ReportType } from '../shared/reports';
import { uniqueId, slugify } from '../shared/slug';
import type { ModuleType } from '../shared/modules';
import { DEFAULT_TASK_MODULE_SETTINGS, serializeColorMaps } from '../shared/tasks-colors';
import { clampPercentDone } from '../shared/tasks';
import { db } from './db/index.ts';
import type { Database } from './db/connection.ts';

type DbExecutor = Parameters<Parameters<Database['transaction']>[0]>[0];
import {
	boardCard,
	cardColumn,
	cardModuleSettings,
	taskItem,
	taskModuleSettings,
	wrkspace,
	wrkspaceMember,
	wrkspaceModule
} from './db/schema.ts';
import {
	assertWithinPlanLimits,
	planLimitFailMessage,
	planLimitToInfo,
	requireTeamCapabilityForUser,
	assertWrkspaceModuleLimit
} from './authorization.ts';
import { recordActivity } from './activity.ts';
import type { CreateWrkspaceFailure, Wrkspace } from './wrkspaces.ts';
import {
	boardRowFromFieldValues,
	resolveCardModuleConfig,
	serializeCardModuleSettings,
	type CardFieldValues
} from '../shared/cards-schema';
import { getModuleTierMin } from '../shared/modules';

export type { WrkspaceTemplate, CardsModuleTemplate, ReportsModuleTemplate };

export function listWrkspaceTemplatesForTier(tier: SubscriptionTier): WrkspaceTemplate[] {
	const maxModules = PLAN_LIMITS[tier].maxModulesPerWrkspace;

	return listWrkspaceTemplates().filter((template) => {
		if (maxModules !== null && template.modules.length > maxModules) {
			return false;
		}

		return template.modules.every((mod) => {
			try {
				assertModuleTypeAllowed(tier, mod.type);
				return true;
			} catch {
				return false;
			}
		});
	});
}

export function listCardsTemplatesForTier(tier: SubscriptionTier): CardsModuleTemplate[] {
	try {
		assertModuleTypeAllowed(tier, 'cards');
		return [...listCardsModuleTemplates()];
	} catch {
		return [];
	}
}

export function listReportsTemplatesForTier(tier: SubscriptionTier): ReportsModuleTemplate[] {
	try {
		assertModuleTypeAllowed(tier, 'reports');
		return [...listReportsModuleTemplates()];
	} catch {
		return [];
	}
}

export { getWrkspaceTemplate, getCardsModuleTemplate, getReportsModuleTemplate };

export async function insertCardsTemplate(
	tx: DbExecutor,
	moduleId: string,
	template: CardsModuleTemplate
): Promise<void> {
	if (template.schema && template.layout) {
		const serialized = serializeCardModuleSettings({
			schema: template.schema,
			layout: template.layout
		});
		await tx.insert(cardModuleSettings).values({
			moduleId,
			schema: serialized.schema,
			layout: serialized.layout
		});
	}

	const config = resolveCardModuleConfig(
		template.schema && template.layout ? { schema: template.schema, layout: template.layout } : null
	);

	const sortedColumns = [...template.columns].sort((a, b) => a.position - b.position);
	for (const column of sortedColumns) {
		const columnId = uniqueId();
		await tx.insert(cardColumn).values({
			id: columnId,
			moduleId,
			title: column.title,
			color: column.color,
			position: column.position
		});

		const cards = [...(column.cards ?? [])].sort((a, b) => a.position - b.position);
		for (const card of cards) {
			const rawValues: Record<string, unknown> = card.fields
				? { ...card.fields }
				: { title: card.title ?? '', body: card.body ?? '' };

			const values = Object.fromEntries(
				Object.entries(rawValues).map(([key, value]) => [key, value ?? null])
			) as CardFieldValues;

			const row = boardRowFromFieldValues(config, values);
			await tx.insert(boardCard).values({
				id: uniqueId(),
				columnId,
				title: row.title,
				body: row.body,
				fieldValues: row.fieldValues ? JSON.stringify(row.fieldValues) : '{}',
				position: card.position
			});
		}
	}
}

export async function insertTasksContent(
	tx: DbExecutor,
	moduleId: string,
	content: TasksModuleContent
): Promise<void> {
	const now = new Date();
	for (const task of content.tasks) {
		await tx.insert(taskItem).values({
			id: uniqueId(),
			moduleId,
			title: task.title,
			description: task.description ?? '',
			notes: task.notes ?? '',
			status: task.status,
			priority: task.priority,
			position: task.position ?? 0,
			percentDone: clampPercentDone(task.percentDone ?? 0),
			createdAt: now,
			updatedAt: now
		});
	}

	const serialized = serializeColorMaps(DEFAULT_TASK_MODULE_SETTINGS);
	await tx.insert(taskModuleSettings).values({
		moduleId,
		colorBy: DEFAULT_TASK_MODULE_SETTINGS.colorBy,
		statusColors: serialized.statusColors,
		priorityColors: serialized.priorityColors
	});
}

export async function insertReportsTemplate(
	tx: DbExecutor,
	wrkspaceId: string,
	moduleId: string,
	moduleTitle: string,
	reportType: ReportType,
	actorUserId: string
): Promise<void> {
	const { resolveDefaultSourceModuleIdsForWrkspace } = await import('./reports.ts');
	const { defaultReportConfigForType, serializeReportConfig } =
		await import('$lib/shared/reports');
	const { reportInstance, reportSourceLink } = await import('./db/schema.ts');

	const [existing] = await tx
		.select({ id: reportInstance.id })
		.from(reportInstance)
		.where(eq(reportInstance.moduleId, moduleId))
		.limit(1);

	if (existing) return;

	const sourceModuleIds = await resolveDefaultSourceModuleIdsForWrkspace(wrkspaceId, reportType);
	const reportId = uniqueId();
	const config = serializeReportConfig(
		reportType,
		defaultReportConfigForType(reportType, { userId: actorUserId })
	);

	await tx.insert(reportInstance).values({
		id: reportId,
		moduleId,
		type: reportType,
		title: moduleTitle,
		config,
		position: 0
	});

	if (sourceModuleIds.length > 0) {
		await tx.insert(reportSourceLink).values(
			sourceModuleIds.map((sourceModuleId) => ({
				id: uniqueId(),
				reportId,
				sourceModuleId
			}))
		);
	}
}

async function applyModuleSnapshot(
	tx: DbExecutor,
	wrkspaceId: string,
	mod: WrkspaceTemplateModule,
	moduleId: string,
	actorUserId: string
): Promise<void> {
	if (mod.type === 'cards' && mod.moduleTemplateId) {
		const cardsTemplate = getCardsModuleTemplate(mod.moduleTemplateId);
		if (!cardsTemplate) {
			throw new Error(`Unknown cards template: ${mod.moduleTemplateId}`);
		}
		await insertCardsTemplate(tx, moduleId, cardsTemplate);
		return;
	}

	if (mod.type === 'reports' && mod.moduleTemplateId) {
		const reportsTemplate = getReportsModuleTemplate(mod.moduleTemplateId);
		if (!reportsTemplate) {
			throw new Error(`Unknown reports template: ${mod.moduleTemplateId}`);
		}
		await insertReportsTemplate(
			tx,
			wrkspaceId,
			moduleId,
			mod.title,
			reportsTemplate.reportType,
			actorUserId
		);
		return;
	}

	if (mod.type === 'tasks' && mod.content?.tasks.length) {
		await insertTasksContent(tx, moduleId, mod.content);
	}
}

export type ApplyCardsModuleTemplateOptions = {
	includeSampleContent?: boolean;
};

export function prepareCardsTemplateForApply(
	template: CardsModuleTemplate,
	options?: ApplyCardsModuleTemplateOptions
): CardsModuleTemplate {
	if (options?.includeSampleContent !== false) return template;
	return {
		...template,
		columns: template.columns.map((column) => ({ ...column, cards: [] }))
	};
}

export async function applyCardsModuleTemplate(
	moduleId: string,
	templateId: string,
	options?: ApplyCardsModuleTemplateOptions
): Promise<boolean> {
	const template = getCardsModuleTemplate(templateId);
	if (!template) return false;

	const [columnCountRow] = await db
		.select({ value: count() })
		.from(cardColumn)
		.where(eq(cardColumn.moduleId, moduleId));

	if (Number(columnCountRow?.value ?? 0) > 0) return false;

	const [moduleRow] = await db
		.select({ creationTemplateId: wrkspaceModule.creationTemplateId })
		.from(wrkspaceModule)
		.where(eq(wrkspaceModule.id, moduleId))
		.limit(1);

	if (moduleRow?.creationTemplateId) return false;

	const prepared = prepareCardsTemplateForApply(template, options);

	await db.transaction(async (tx) => {
		await insertCardsTemplate(tx, moduleId, prepared);
		await tx
			.update(wrkspaceModule)
			.set({ creationTemplateId: templateId })
			.where(eq(wrkspaceModule.id, moduleId));
	});

	return true;
}

export async function createWrkspaceFromTemplate(
	userId: string,
	teamSlug: string,
	data: { name: string; description?: string; slug?: string },
	templateId: string
): Promise<Wrkspace | CreateWrkspaceFailure> {
	if (templateId === BLANK_WRKSPACE_TEMPLATE_ID) {
		const { createWrkspaceForTeam } = await import('./wrkspaces.ts');
		return createWrkspaceForTeam(userId, teamSlug, data);
	}

	const template = getWrkspaceTemplate(templateId);
	if (!template) {
		return { error: 'Unknown template' };
	}

	let membership;
	try {
		membership = await requireTeamCapabilityForUser(userId, teamSlug, 'create_wrkspace');
	} catch {
		return { error: 'Forbidden' };
	}

	try {
		await assertWithinPlanLimits(
			membership.teamId,
			membership.subscriptionTier,
			membership.extraMemberSeats,
			'wrkspaces',
			1
		);
	} catch (err) {
		if (err instanceof PlanLimitError) {
			return { error: planLimitFailMessage(err), planLimit: planLimitToInfo(err) };
		}
		throw err;
	}

	for (const mod of template.modules) {
		try {
			assertModuleTypeAllowed(membership.subscriptionTier, mod.type);
		} catch (err) {
			if (err instanceof PlanLimitError) {
				const requiredTier = getModuleTierMin(mod.type);
				return {
					error: planLimitFailMessage(err),
					planLimit: planLimitToInfo(err, requiredTier)
				};
			}
			throw err;
		}
	}

	const baseSlug = slugify(data.slug ?? data.name) || `wrkspace-${Date.now()}`;
	let slug = baseSlug;
	let suffix = 1;

	while (
		await db
			.select({ id: wrkspace.id })
			.from(wrkspace)
			.where(and(eq(wrkspace.teamId, membership.teamId), eq(wrkspace.slug, slug)))
			.limit(1)
			.then((r) => r[0])
	) {
		slug = `${baseSlug}-${suffix++}`;
	}

	const wrkspaceId = uniqueId();

	try {
		await assertWrkspaceModuleLimit(
			// Pre-check against a non-existent wrkspace id — current count is 0.
			wrkspaceId,
			membership.subscriptionTier,
			template.modules.length
		);

		const { row: created, insertedModules } = await db.transaction(async (tx) => {
			const [row] = await tx
				.insert(wrkspace)
				.values({
					id: wrkspaceId,
					teamId: membership.teamId,
					name: data.name,
					description: data.description ?? '',
					slug,
					createdById: userId
				})
				.returning({
					id: wrkspace.id,
					teamId: wrkspace.teamId,
					name: wrkspace.name,
					description: wrkspace.description,
					slug: wrkspace.slug
				});

			await tx.insert(wrkspaceMember).values({
				wrkspaceId,
				userId,
				role: 'owner'
			});

			const sortedModules = [...template.modules].sort((a, b) => a.position - b.position);
			const insertedModules: { id: string; type: ModuleType; title: string }[] = [];

			for (const mod of sortedModules) {
				const moduleId = uniqueId();
				const creationTemplateId =
					(mod.type === 'cards' || mod.type === 'reports') && mod.moduleTemplateId
						? mod.moduleTemplateId
						: null;

				await tx.insert(wrkspaceModule).values({
					id: moduleId,
					wrkspaceId,
					type: mod.type,
					title: mod.title,
					position: mod.position,
					creationTemplateId
				});

				await applyModuleSnapshot(tx, wrkspaceId, mod, moduleId, userId);
				insertedModules.push({ id: moduleId, type: mod.type, title: mod.title });
			}

			return { row, insertedModules };
		});

		for (const mod of insertedModules) {
			await recordActivity({
				wrkspaceId,
				actorUserId: userId,
				type: 'module.added',
				moduleId: mod.id,
				moduleType: mod.type,
				targetType: 'module',
				targetId: mod.id,
				metadata: {
					moduleTitle: mod.title,
					title: mod.title,
					moduleType: mod.type
				}
			});
		}

		return { ...created, teamSlug: membership.teamSlug };
	} catch (err) {
		if (err instanceof PlanLimitError) {
			const requiredTier =
				err.code === 'PLAN_MODULE_GATED' && template.modules[0]
					? getModuleTierMin(template.modules[0].type)
					: undefined;
			return {
				error: planLimitFailMessage(err),
				planLimit: planLimitToInfo(err, requiredTier)
			};
		}
		throw err;
	}
}

export type AddModuleWithTemplateOptions = {
	cardsTemplateId?: string;
	reportsTemplateId?: string;
};

export async function addModuleWithTemplate(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	type: ModuleType,
	options?: AddModuleWithTemplateOptions
): Promise<
	| {
			id: string;
			wrkspaceId: string;
			type: ModuleType;
			title: string;
			position: number;
			teamSlug: string;
			wrkspaceSlug: string;
	  }
	| { error: string; planLimit?: PlanLimitInfo }
	| undefined
> {
	const creationTemplateId = type === 'reports' ? (options?.reportsTemplateId ?? null) : null;

	const { addModule } = await import('./modules.ts');
	const created = await addModule(userId, teamSlug, wrkspaceSlug, type, {
		creationTemplateId
	});

	if (!created || 'error' in created) {
		return created;
	}

	return created;
}
