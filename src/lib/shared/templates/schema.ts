import { getModuleCatalogEntry, isModuleType, type ModuleType } from '../modules';
import { isReportType, type ReportType } from '../reports';
import { isTaskPriority, isTaskStatus, type TaskPriority, type TaskStatus } from '../tasks';
import {
	isCardFieldType,
	validateCardModuleSchema,
	type CardModuleLayout,
	type CardModuleSchema
} from '../cards-schema';

export type TemplateKind = 'preset' | 'full';

export type CardsTemplateCard = {
	title?: string;
	body?: string;
	position: number;
	fields?: Record<string, string | number>;
};

export type CardsTemplateColumn = {
	title: string;
	color: string;
	position: number;
	cards?: CardsTemplateCard[];
};

export type CardsModuleTemplate = {
	id: string;
	moduleType: 'cards';
	name: string;
	description: string;
	headline?: string;
	sortOrder?: number;
	includesSampleContent?: boolean;
	columns: CardsTemplateColumn[];
	schema?: CardModuleSchema;
	layout?: CardModuleLayout;
};

export type ReportsModuleTemplate = {
	id: string;
	moduleType: 'reports';
	reportType: ReportType;
	name: string;
	description: string;
};

export type TasksTemplateTask = {
	title: string;
	description?: string;
	notes?: string;
	status: TaskStatus;
	priority: TaskPriority;
	position?: number;
	percentDone?: number;
};

export type TasksModuleContent = {
	tasks: TasksTemplateTask[];
};

export type WrkspaceTemplateModule = {
	key: string;
	type: ModuleType;
	title: string;
	position: number;
	moduleTemplateId?: string;
	content?: TasksModuleContent;
};

export type WrkspaceTemplate = {
	id: string;
	kind: TemplateKind;
	name: string;
	description: string;
	includesSampleContent: boolean;
	modules: WrkspaceTemplateModule[];
};

export type TemplateValidationIssue = {
	path: string;
	message: string;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
	value: unknown,
	path: string,
	issues: TemplateValidationIssue[]
): string | undefined {
	if (typeof value !== 'string' || !value.trim()) {
		issues.push({ path, message: 'expected non-empty string' });
		return undefined;
	}
	return value.trim();
}

function requireNumber(
	value: unknown,
	path: string,
	issues: TemplateValidationIssue[]
): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		issues.push({ path, message: 'expected number' });
		return undefined;
	}
	return value;
}

function parseCardsTemplateColumn(
	raw: unknown,
	path: string,
	issues: TemplateValidationIssue[]
): CardsTemplateColumn | undefined {
	if (!isRecord(raw)) {
		issues.push({ path, message: 'expected object' });
		return undefined;
	}

	const title = requireString(raw.title, `${path}.title`, issues);
	const color = requireString(raw.color, `${path}.color`, issues);
	const position = requireNumber(raw.position, `${path}.position`, issues);
	if (color && !HEX_COLOR.test(color)) {
		issues.push({ path: `${path}.color`, message: 'expected hex color (#rrggbb)' });
	}
	if (!title || !color || position === undefined) return undefined;

	const cards: CardsTemplateCard[] = [];
	if (raw.cards !== undefined) {
		if (!Array.isArray(raw.cards)) {
			issues.push({ path: `${path}.cards`, message: 'expected array' });
		} else {
			for (let i = 0; i < raw.cards.length; i++) {
				const card = parseCardsTemplateCard(raw.cards[i], `${path}.cards[${i}]`, issues);
				if (card) cards.push(card);
			}
		}
	}

	return { title, color, position, cards: cards.length > 0 ? cards : undefined };
}

function parseCardsTemplateCard(
	raw: unknown,
	path: string,
	issues: TemplateValidationIssue[]
): CardsTemplateCard | undefined {
	if (!isRecord(raw)) {
		issues.push({ path, message: 'expected object' });
		return undefined;
	}

	const position = requireNumber(raw.position, `${path}.position`, issues);
	if (position === undefined) return undefined;

	let title = typeof raw.title === 'string' ? raw.title.trim() : undefined;
	const body = typeof raw.body === 'string' ? raw.body : '';

	let fields: Record<string, string | number> | undefined;
	if (raw.fields !== undefined) {
		if (!isRecord(raw.fields)) {
			issues.push({ path: `${path}.fields`, message: 'expected object' });
		} else {
			fields = {};
			for (const [key, value] of Object.entries(raw.fields)) {
				if (typeof value === 'string' || typeof value === 'number') {
					fields[key] = value;
				}
			}
			if (!title && typeof fields.title === 'string') {
				title = fields.title;
			}
		}
	}

	if (!title) {
		issues.push({ path: `${path}.title`, message: 'expected non-empty string' });
		return undefined;
	}

	return { title, body, position, fields };
}

function parseCardModuleSchema(
	raw: unknown,
	path: string,
	issues: TemplateValidationIssue[]
): CardModuleSchema | undefined {
	if (!isRecord(raw) || !Array.isArray(raw.fields)) {
		issues.push({ path, message: 'expected schema object with fields array' });
		return undefined;
	}

	const fields: CardModuleSchema['fields'] = [];
	for (let i = 0; i < raw.fields.length; i++) {
		const item = raw.fields[i];
		const itemPath = `${path}.fields[${i}]`;
		if (!isRecord(item)) {
			issues.push({ path: itemPath, message: 'expected object' });
			continue;
		}
		const key = requireString(item.key, `${itemPath}.key`, issues);
		const label = requireString(item.label, `${itemPath}.label`, issues);
		const typeRaw = requireString(item.type, `${itemPath}.type`, issues);
		if (!key || !label || !typeRaw || !isCardFieldType(typeRaw)) continue;

		const field: CardModuleSchema['fields'][number] = {
			key,
			label,
			type: typeRaw,
			required: item.required === true
		};
		if (typeRaw === 'select' && Array.isArray(item.options)) {
			field.options = item.options.filter((option): option is string => typeof option === 'string');
		}
		fields.push(field);
	}

	return { fields };
}

function parseCardModuleLayout(
	raw: unknown,
	path: string,
	issues: TemplateValidationIssue[]
): CardModuleLayout | undefined {
	if (!isRecord(raw)) {
		issues.push({ path, message: 'expected object' });
		return undefined;
	}

	const primaryFieldKey = requireString(raw.primaryFieldKey, `${path}.primaryFieldKey`, issues);
	if (!primaryFieldKey) return undefined;

	const faceFieldKeys: string[] = [];
	if (!Array.isArray(raw.faceFieldKeys)) {
		issues.push({ path: `${path}.faceFieldKeys`, message: 'expected array' });
		return undefined;
	}
	for (let i = 0; i < raw.faceFieldKeys.length; i++) {
		const key = requireString(raw.faceFieldKeys[i], `${path}.faceFieldKeys[${i}]`, issues);
		if (key) faceFieldKeys.push(key);
	}

	return { primaryFieldKey, faceFieldKeys };
}

export function parseReportsModuleTemplate(
	raw: unknown,
	path = 'template'
): { template?: ReportsModuleTemplate; issues: TemplateValidationIssue[] } {
	const issues: TemplateValidationIssue[] = [];
	if (!isRecord(raw)) {
		issues.push({ path, message: 'expected object' });
		return { issues };
	}

	const id = requireString(raw.id, `${path}.id`, issues);
	const moduleType = requireString(raw.moduleType, `${path}.moduleType`, issues);
	const reportTypeRaw = requireString(raw.reportType, `${path}.reportType`, issues);
	const name = requireString(raw.name, `${path}.name`, issues);
	const description = requireString(raw.description, `${path}.description`, issues);

	if (moduleType !== 'reports') {
		issues.push({
			path: `${path}.moduleType`,
			message: 'reports templates require moduleType "reports"'
		});
	}

	if (reportTypeRaw && !isReportType(reportTypeRaw)) {
		issues.push({ path: `${path}.reportType`, message: 'unknown report type' });
	}

	if (!id || !name || !description || !reportTypeRaw || !isReportType(reportTypeRaw)) {
		return { issues };
	}

	return {
		template: {
			id,
			moduleType: 'reports',
			reportType: reportTypeRaw,
			name,
			description
		},
		issues
	};
}

export function parseCardsModuleTemplate(
	raw: unknown,
	path = 'template'
): { template?: CardsModuleTemplate; issues: TemplateValidationIssue[] } {
	const issues: TemplateValidationIssue[] = [];
	if (!isRecord(raw)) {
		issues.push({ path, message: 'expected object' });
		return { issues };
	}

	const id = requireString(raw.id, `${path}.id`, issues);
	const moduleType = requireString(raw.moduleType, `${path}.moduleType`, issues);
	const name = requireString(raw.name, `${path}.name`, issues);
	const description = requireString(raw.description, `${path}.description`, issues);

	if (moduleType !== 'cards') {
		issues.push({
			path: `${path}.moduleType`,
			message: 'cards templates require moduleType "cards"'
		});
	}

	const columns: CardsTemplateColumn[] = [];
	if (!Array.isArray(raw.columns)) {
		issues.push({ path: `${path}.columns`, message: 'expected array' });
	} else {
		for (let i = 0; i < raw.columns.length; i++) {
			const column = parseCardsTemplateColumn(raw.columns[i], `${path}.columns[${i}]`, issues);
			if (column) columns.push(column);
		}
	}

	if (!id || !name || !description) return { issues };

	let schema: CardModuleSchema | undefined;
	let layout: CardModuleLayout | undefined;
	if (raw.schema !== undefined) {
		schema = parseCardModuleSchema(raw.schema, `${path}.schema`, issues);
	}
	if (raw.layout !== undefined) {
		layout = parseCardModuleLayout(raw.layout, `${path}.layout`, issues);
	}
	if ((schema && !layout) || (!schema && layout)) {
		issues.push({ path, message: 'schema and layout must both be present when either is set' });
	}
	if (schema && layout) {
		const validation = validateCardModuleSchema(schema, layout);
		for (const message of validation.errors) {
			issues.push({ path, message });
		}
	}

	const headline =
		raw.headline === undefined
			? undefined
			: requireString(raw.headline, `${path}.headline`, issues);
	const sortOrder =
		raw.sortOrder === undefined
			? undefined
			: requireNumber(raw.sortOrder, `${path}.sortOrder`, issues);
	let includesSampleContent: boolean | undefined;
	if (raw.includesSampleContent !== undefined) {
		if (typeof raw.includesSampleContent !== 'boolean') {
			issues.push({ path: `${path}.includesSampleContent`, message: 'expected boolean' });
		} else {
			includesSampleContent = raw.includesSampleContent;
		}
	}

	return {
		template: {
			id,
			moduleType: 'cards',
			name,
			description,
			headline,
			sortOrder,
			includesSampleContent,
			columns,
			schema,
			layout
		},
		issues
	};
}

function parseTasksModuleContent(
	raw: unknown,
	path: string,
	issues: TemplateValidationIssue[]
): TasksModuleContent | undefined {
	if (!isRecord(raw)) {
		issues.push({ path, message: 'expected object' });
		return undefined;
	}

	if (!Array.isArray(raw.tasks)) {
		issues.push({ path: `${path}.tasks`, message: 'expected array' });
		return undefined;
	}

	const tasks: TasksTemplateTask[] = [];
	for (let i = 0; i < raw.tasks.length; i++) {
		const item = raw.tasks[i];
		const itemPath = `${path}.tasks[${i}]`;
		if (!isRecord(item)) {
			issues.push({ path: itemPath, message: 'expected object' });
			continue;
		}

		const title = requireString(item.title, `${itemPath}.title`, issues);
		const statusRaw = requireString(item.status, `${itemPath}.status`, issues);
		const priorityRaw = requireString(item.priority, `${itemPath}.priority`, issues);
		if (!title || !statusRaw || !priorityRaw) continue;

		if (!isTaskStatus(statusRaw)) {
			issues.push({ path: `${itemPath}.status`, message: `invalid task status: ${statusRaw}` });
			continue;
		}
		if (!isTaskPriority(priorityRaw)) {
			issues.push({
				path: `${itemPath}.priority`,
				message: `invalid task priority: ${priorityRaw}`
			});
			continue;
		}

		tasks.push({
			title,
			description: typeof item.description === 'string' ? item.description : undefined,
			notes: typeof item.notes === 'string' ? item.notes : undefined,
			status: statusRaw,
			priority: priorityRaw,
			position: typeof item.position === 'number' ? item.position : undefined,
			percentDone: typeof item.percentDone === 'number' ? item.percentDone : undefined
		});
	}

	return { tasks };
}

function parseWrkspaceTemplateModule(
	raw: unknown,
	path: string,
	issues: TemplateValidationIssue[]
): WrkspaceTemplateModule | undefined {
	if (!isRecord(raw)) {
		issues.push({ path, message: 'expected object' });
		return undefined;
	}

	const key = requireString(raw.key, `${path}.key`, issues);
	const typeRaw = requireString(raw.type, `${path}.type`, issues);
	const title = requireString(raw.title, `${path}.title`, issues);
	const position = requireNumber(raw.position, `${path}.position`, issues);
	if (!key || !typeRaw || !title || position === undefined) return undefined;

	if (!isModuleType(typeRaw)) {
		issues.push({ path: `${path}.type`, message: `unknown module type: ${typeRaw}` });
		return undefined;
	}

	const entry = getModuleCatalogEntry(typeRaw);
	if (!entry.enabled) {
		issues.push({ path: `${path}.type`, message: `module type is disabled: ${typeRaw}` });
	}

	const moduleTemplateId =
		raw.moduleTemplateId === undefined
			? undefined
			: requireString(raw.moduleTemplateId, `${path}.moduleTemplateId`, issues);

	let content: TasksModuleContent | undefined;
	if (raw.content !== undefined) {
		if (typeRaw !== 'tasks') {
			issues.push({
				path: `${path}.content`,
				message: 'inline content is only supported for tasks modules'
			});
		} else {
			content = parseTasksModuleContent(raw.content, `${path}.content`, issues);
		}
	}

	return {
		key,
		type: typeRaw,
		title,
		position,
		moduleTemplateId,
		content
	};
}

export function parseWrkspaceTemplate(
	raw: unknown,
	path = 'template'
): { template?: WrkspaceTemplate; issues: TemplateValidationIssue[] } {
	const issues: TemplateValidationIssue[] = [];
	if (!isRecord(raw)) {
		issues.push({ path, message: 'expected object' });
		return { issues };
	}

	const id = requireString(raw.id, `${path}.id`, issues);
	const kindRaw = requireString(raw.kind, `${path}.kind`, issues);
	const name = requireString(raw.name, `${path}.name`, issues);
	const description = requireString(raw.description, `${path}.description`, issues);

	if (kindRaw !== 'preset' && kindRaw !== 'full') {
		issues.push({ path: `${path}.kind`, message: 'kind must be "preset" or "full"' });
	}

	if (typeof raw.includesSampleContent !== 'boolean') {
		issues.push({ path: `${path}.includesSampleContent`, message: 'expected boolean' });
	}

	const modules: WrkspaceTemplateModule[] = [];
	if (!Array.isArray(raw.modules)) {
		issues.push({ path: `${path}.modules`, message: 'expected array' });
	} else {
		const keys = new Set<string>();
		for (let i = 0; i < raw.modules.length; i++) {
			const mod = parseWrkspaceTemplateModule(raw.modules[i], `${path}.modules[${i}]`, issues);
			if (mod) {
				if (keys.has(mod.key)) {
					issues.push({
						path: `${path}.modules[${i}].key`,
						message: `duplicate module key: ${mod.key}`
					});
				} else {
					keys.add(mod.key);
				}
				modules.push(mod);
			}
		}
	}

	if (!id || !name || !description || (kindRaw !== 'preset' && kindRaw !== 'full')) {
		return { issues };
	}

	const includesSampleContent = raw.includesSampleContent === true;
	const kind = kindRaw as TemplateKind;

	if (kind === 'preset' && includesSampleContent) {
		issues.push({
			path: `${path}.includesSampleContent`,
			message: 'preset templates must not include sample content'
		});
	}
	if (
		kind === 'full' &&
		modules.some((m) => m.content || m.moduleTemplateId) &&
		!includesSampleContent
	) {
		issues.push({
			path: `${path}.includesSampleContent`,
			message: 'full templates with module snapshots must set includesSampleContent to true'
		});
	}

	return {
		template: {
			id,
			kind,
			name,
			description,
			includesSampleContent,
			modules
		},
		issues
	};
}

export function validateTemplateCatalog(
	wrkspaceTemplates: WrkspaceTemplate[],
	cardsTemplates: CardsModuleTemplate[],
	reportsTemplates: ReportsModuleTemplate[] = []
): TemplateValidationIssue[] {
	const issues: TemplateValidationIssue[] = [];
	const wrkspaceIds = new Set<string>();
	const cardsIds = new Set<string>();
	const reportsIds = new Set<string>();

	for (const template of wrkspaceTemplates) {
		if (wrkspaceIds.has(template.id)) {
			issues.push({ path: `wrkspace.${template.id}`, message: 'duplicate wrkspace template id' });
		}
		wrkspaceIds.add(template.id);

		for (const mod of template.modules) {
			if (mod.moduleTemplateId) {
				if (mod.type !== 'cards' && mod.type !== 'reports') {
					issues.push({
						path: `wrkspace.${template.id}.modules.${mod.key}`,
						message: 'moduleTemplateId is only supported for cards and reports modules in v1'
					});
				}
			}
		}
	}

	for (const template of cardsTemplates) {
		if (cardsIds.has(template.id)) {
			issues.push({ path: `cards.${template.id}`, message: 'duplicate cards template id' });
		}
		cardsIds.add(template.id);
	}

	for (const template of reportsTemplates) {
		if (reportsIds.has(template.id)) {
			issues.push({ path: `reports.${template.id}`, message: 'duplicate reports template id' });
		}
		reportsIds.add(template.id);
	}

	for (const template of wrkspaceTemplates) {
		for (const mod of template.modules) {
			if (!mod.moduleTemplateId) continue;
			if (mod.type === 'cards' && !cardsIds.has(mod.moduleTemplateId)) {
				issues.push({
					path: `wrkspace.${template.id}.modules.${mod.key}.moduleTemplateId`,
					message: `unknown cards template: ${mod.moduleTemplateId}`
				});
			}
			if (mod.type === 'reports' && !reportsIds.has(mod.moduleTemplateId)) {
				issues.push({
					path: `wrkspace.${template.id}.modules.${mod.key}.moduleTemplateId`,
					message: `unknown reports template: ${mod.moduleTemplateId}`
				});
			}
		}
	}

	return issues;
}
