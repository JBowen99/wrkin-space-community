import type { CardsModuleTemplate } from './schema';
import { CARDS_MODULE_TEMPLATES } from './catalog';

export type CardsPresetOption = {
	id: string;
	name: string;
	description: string;
	headline: string;
	detailLines: string[];
	columnTitles: { title: string; color: string }[];
	fieldLabels: string[];
	includesSampleContent: boolean;
	sortOrder: number;
};

export function cardsPresetDetailLines(template: CardsModuleTemplate): string[] {
	const lines: string[] = [];

	if (template.columns.length > 0) {
		lines.push(`Columns: ${template.columns.map((column) => column.title).join(', ')}`);
	} else {
		lines.push('No columns — add your own workflow');
	}

	if (template.schema?.fields.length) {
		lines.push(`Fields: ${template.schema.fields.map((field) => field.label).join(', ')}`);
	}

	return lines;
}

export function cardsPresetHeadline(template: CardsModuleTemplate): string {
	if (template.headline?.trim()) return template.headline.trim();
	return template.description;
}

export function toCardsPresetOption(template: CardsModuleTemplate): CardsPresetOption {
	return {
		id: template.id,
		name: template.name,
		description: template.description,
		headline: cardsPresetHeadline(template),
		detailLines: cardsPresetDetailLines(template),
		columnTitles: template.columns.map((column) => ({
			title: column.title,
			color: column.color
		})),
		fieldLabels: template.schema?.fields.map((field) => field.label) ?? [],
		includesSampleContent: template.includesSampleContent ?? hasSampleCards(template),
		sortOrder: template.sortOrder ?? 100
	};
}

function hasSampleCards(template: CardsModuleTemplate): boolean {
	return template.columns.some((column) => (column.cards?.length ?? 0) > 0);
}

export function listCardsPresetOptions(): readonly CardsPresetOption[] {
	return [...CARDS_MODULE_TEMPLATES]
		.map(toCardsPresetOption)
		.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function getCardsPresetOption(id: string): CardsPresetOption | undefined {
	const template = CARDS_MODULE_TEMPLATES.find((item) => item.id === id);
	return template ? toCardsPresetOption(template) : undefined;
}
