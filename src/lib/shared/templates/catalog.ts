import blank from './wrkspace/blank.json';
import essentials from './wrkspace/essentials.json';
import teamHub from './wrkspace/team-hub.json';
import productDelivery from './wrkspace/product-delivery.json';
import cardsEmpty from './module/cards/empty.json';
import cardsKanbanSimple from './module/cards/kanban-simple.json';
import cardsKanbanBacklogReview from './module/cards/kanban-backlog-review.json';
import cardsBugTriage from './module/cards/bug-triage.json';
import cardsActionItems from './module/cards/action-items.json';
import reportsProgress from './module/reports/progress.json';
import reportsTimeline from './module/reports/timeline.json';
import reportsWorkload from './module/reports/workload.json';
import reportsPersonal from './module/reports/personal.json';
import reportsActivityDigest from './module/reports/activity-digest.json';
import reportsSummary from './module/reports/summary.json';
import {
	parseCardsModuleTemplate,
	parseReportsModuleTemplate,
	parseWrkspaceTemplate,
	validateTemplateCatalog,
	type CardsModuleTemplate,
	type ReportsModuleTemplate,
	type TemplateValidationIssue,
	type WrkspaceTemplate
} from './schema';

const WRKSPACE_RAW = [blank, essentials, teamHub, productDelivery] as const;
const CARDS_RAW = [
	cardsEmpty,
	cardsKanbanSimple,
	cardsActionItems,
	cardsKanbanBacklogReview,
	cardsBugTriage
] as const;
const REPORTS_RAW = [
	reportsProgress,
	reportsTimeline,
	reportsWorkload,
	reportsPersonal,
	reportsActivityDigest,
	reportsSummary
] as const;

function loadCatalog(): {
	wrkspaceTemplates: WrkspaceTemplate[];
	cardsTemplates: CardsModuleTemplate[];
	reportsTemplates: ReportsModuleTemplate[];
	issues: TemplateValidationIssue[];
} {
	const issues: TemplateValidationIssue[] = [];
	const wrkspaceTemplates: WrkspaceTemplate[] = [];
	const cardsTemplates: CardsModuleTemplate[] = [];
	const reportsTemplates: ReportsModuleTemplate[] = [];

	for (const raw of WRKSPACE_RAW) {
		const parsed = parseWrkspaceTemplate(
			raw,
			`wrkspace.${(raw as { id?: string }).id ?? 'unknown'}`
		);
		issues.push(...parsed.issues);
		if (parsed.template) wrkspaceTemplates.push(parsed.template);
	}

	for (const raw of CARDS_RAW) {
		const parsed = parseCardsModuleTemplate(
			raw,
			`cards.${(raw as { id?: string }).id ?? 'unknown'}`
		);
		issues.push(...parsed.issues);
		if (parsed.template) cardsTemplates.push(parsed.template);
	}

	for (const raw of REPORTS_RAW) {
		const parsed = parseReportsModuleTemplate(
			raw,
			`reports.${(raw as { id?: string }).id ?? 'unknown'}`
		);
		issues.push(...parsed.issues);
		if (parsed.template) reportsTemplates.push(parsed.template);
	}

	issues.push(...validateTemplateCatalog(wrkspaceTemplates, cardsTemplates, reportsTemplates));

	return { wrkspaceTemplates, cardsTemplates, reportsTemplates, issues };
}

const loaded = loadCatalog();

if (loaded.issues.length > 0) {
	const detail = loaded.issues.map((i) => `  ${i.path}: ${i.message}`).join('\n');
	throw new Error(`Invalid template catalog:\n${detail}`);
}

export const WRKSPACE_TEMPLATES: readonly WrkspaceTemplate[] = loaded.wrkspaceTemplates;
export const CARDS_MODULE_TEMPLATES: readonly CardsModuleTemplate[] = loaded.cardsTemplates;
export const REPORTS_MODULE_TEMPLATES: readonly ReportsModuleTemplate[] = loaded.reportsTemplates;

export const BLANK_WRKSPACE_TEMPLATE_ID = 'blank' as const;

export function getWrkspaceTemplate(id: string): WrkspaceTemplate | undefined {
	return WRKSPACE_TEMPLATES.find((t) => t.id === id);
}

export function getCardsModuleTemplate(id: string): CardsModuleTemplate | undefined {
	return CARDS_MODULE_TEMPLATES.find((t) => t.id === id);
}

export function getReportsModuleTemplate(id: string): ReportsModuleTemplate | undefined {
	return REPORTS_MODULE_TEMPLATES.find((t) => t.id === id);
}

export function listWrkspaceTemplates(): readonly WrkspaceTemplate[] {
	return WRKSPACE_TEMPLATES;
}

export function listCardsModuleTemplates(): readonly CardsModuleTemplate[] {
	return CARDS_MODULE_TEMPLATES;
}

export function listReportsModuleTemplates(): readonly ReportsModuleTemplate[] {
	return REPORTS_MODULE_TEMPLATES;
}

/** Re-export for validate script and tests without loading side effects twice. */
export function validateRawCatalog(): TemplateValidationIssue[] {
	return loadCatalog().issues;
}
