import { describe, expect, it } from 'vitest';
import { listCardsPresetOptions, getCardsPresetOption } from './cards-preset-display';
import { getCardsModuleTemplate } from './catalog';

describe('listCardsPresetOptions', () => {
	it('returns all built-in presets sorted by sortOrder', () => {
		const options = listCardsPresetOptions();
		expect(options.length).toBeGreaterThanOrEqual(5);
		expect(options[0]?.id).toBe('kanban-simple');
		expect(options[0]?.name).toBe('Simple Task Tracker');
		expect(options.map((option) => option.id)).toContain('action-items');
	});

	it('includes field labels in detail lines for schema presets', () => {
		const bugTriage = getCardsPresetOption('bug-triage');
		expect(bugTriage?.detailLines.some((line) => line.includes('Severity'))).toBe(true);
		expect(bugTriage?.fieldLabels).toContain('Severity');
		expect(bugTriage?.fieldLabels).toContain('Bug found date');
		expect(bugTriage?.fieldLabels).toContain('Bug fixed date');
		expect(bugTriage?.includesSampleContent).toBe(true);
	});

	it('derives includesSampleContent from cards when not set explicitly', () => {
		const template = getCardsModuleTemplate('kanban-backlog-review');
		expect(template).toBeDefined();
		const option = getCardsPresetOption('kanban-backlog-review');
		expect(option?.includesSampleContent).toBe(true);
	});
});
