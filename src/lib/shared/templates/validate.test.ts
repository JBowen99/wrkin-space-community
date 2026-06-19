import { describe, expect, it } from 'vitest';
import { parseCardsModuleTemplate, parseWrkspaceTemplate, validateTemplateCatalog } from './schema';
import { validateRawCatalog } from './catalog';

describe('template catalog', () => {
	it('loads built-in catalog without validation errors', () => {
		expect(validateRawCatalog()).toEqual([]);
	});

	it('rejects unknown module type in wrkspace template', () => {
		const { issues } = parseWrkspaceTemplate({
			id: 'bad',
			kind: 'preset',
			name: 'Bad',
			description: 'Bad',
			includesSampleContent: false,
			modules: [{ key: 'x', type: 'not-a-module', title: 'X', position: 0 }]
		});
		expect(issues.some((i) => i.path.includes('.type'))).toBe(true);
	});

	it('rejects invalid task status in inline content', () => {
		const { issues } = parseWrkspaceTemplate({
			id: 'bad-tasks',
			kind: 'full',
			name: 'Bad tasks',
			description: 'Bad',
			includesSampleContent: true,
			modules: [
				{
					key: 'tasks',
					type: 'tasks',
					title: 'Tasks',
					position: 0,
					content: {
						tasks: [{ title: 'T', status: 'invalid', priority: 'low' }]
					}
				}
			]
		});
		expect(issues.some((i) => i.message.includes('invalid task status'))).toBe(true);
	});

	it('rejects dangling cards moduleTemplateId reference', () => {
		const wrkspace = parseWrkspaceTemplate({
			id: 'ref',
			kind: 'full',
			name: 'Ref',
			description: 'Ref',
			includesSampleContent: true,
			modules: [
				{
					key: 'cards',
					type: 'cards',
					title: 'Board',
					position: 0,
					moduleTemplateId: 'missing'
				}
			]
		}).template!;

		const issues = validateTemplateCatalog([wrkspace], []);
		expect(issues.some((i) => i.message.includes('unknown cards template'))).toBe(true);
	});

	it('rejects non-hex column colors', () => {
		const { issues } = parseCardsModuleTemplate({
			id: 'bad-color',
			moduleType: 'cards',
			name: 'Bad',
			description: 'Bad',
			columns: [{ title: 'Col', color: 'red', position: 0 }]
		});
		expect(issues.some((i) => i.path.endsWith('.color'))).toBe(true);
	});

	it('accepts cards templates with schema and field values', () => {
		const { template, issues } = parseCardsModuleTemplate({
			id: 'custom',
			moduleType: 'cards',
			name: 'Custom',
			description: 'Custom',
			schema: {
				fields: [
					{ key: 'title', label: 'Title', type: 'short_text', required: true },
					{
						key: 'severity',
						label: 'Severity',
						type: 'select',
						options: ['High', 'Low']
					}
				]
			},
			layout: { primaryFieldKey: 'title', faceFieldKeys: ['title', 'severity'] },
			columns: [
				{
					title: 'New',
					color: '#ef4444',
					position: 0,
					cards: [{ position: 0, fields: { title: 'Bug', severity: 'High' } }]
				}
			]
		});
		expect(issues).toEqual([]);
		expect(template?.schema?.fields).toHaveLength(2);
	});
});
