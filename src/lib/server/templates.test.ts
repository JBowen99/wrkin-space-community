import { describe, expect, it } from 'vitest';
import { getCardsModuleTemplate } from '../shared/templates';
import { prepareCardsTemplateForApply } from './templates.ts';

describe('prepareCardsTemplateForApply', () => {
	it('strips sample cards when includeSampleContent is false', () => {
		const template = getCardsModuleTemplate('bug-triage');
		expect(template).toBeDefined();

		const prepared = prepareCardsTemplateForApply(template!, { includeSampleContent: false });
		expect(prepared.columns.every((column) => (column.cards?.length ?? 0) === 0)).toBe(true);
		expect(prepared.schema).toEqual(template!.schema);
	});

	it('keeps sample cards by default', () => {
		const template = getCardsModuleTemplate('kanban-backlog-review');
		expect(template).toBeDefined();

		const prepared = prepareCardsTemplateForApply(template!);
		expect(prepared.columns.some((column) => (column.cards?.length ?? 0) > 0)).toBe(true);
	});
});
