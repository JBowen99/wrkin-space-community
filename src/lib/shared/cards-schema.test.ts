import { describe, expect, it } from 'vitest';
import {
	DEFAULT_CARD_MODULE_LAYOUT,
	DEFAULT_CARD_MODULE_SCHEMA,
	buildCardActivitySummary,
	formatCardFieldValue,
	primaryFieldTitle,
	resolveCardModuleConfig,
	validateCardFieldValues,
	validateCardModuleSchema
} from './cards-schema';

describe('resolveCardModuleConfig', () => {
	it('returns default schema when settings are null', () => {
		const config = resolveCardModuleConfig(null);
		expect(config.isCustom).toBe(false);
		expect(config.schema.fields).toHaveLength(2);
		expect(config.layout.primaryFieldKey).toBe('title');
	});
});

describe('validateCardModuleSchema', () => {
	it('accepts the default schema', () => {
		const result = validateCardModuleSchema(DEFAULT_CARD_MODULE_SCHEMA, DEFAULT_CARD_MODULE_LAYOUT);
		expect(result.ok).toBe(true);
	});

	it('rejects select fields without options', () => {
		const result = validateCardModuleSchema(
			{
				fields: [
					{ key: 'title', label: 'Title', type: 'short_text', required: true },
					{ key: 'status', label: 'Status', type: 'select', required: true }
				]
			},
			{ primaryFieldKey: 'title', faceFieldKeys: ['title'] }
		);
		expect(result.ok).toBe(false);
	});
});

describe('validateCardFieldValues', () => {
	it('validates required fields', () => {
		const result = validateCardFieldValues(DEFAULT_CARD_MODULE_SCHEMA, {
			title: '  Ship it  ',
			body: ''
		});
		expect(result.ok).toBe(true);
		expect(result.values.title).toBe('Ship it');
	});

	it('rejects invalid select values', () => {
		const schema = {
			fields: [
				{ key: 'title', label: 'Title', type: 'short_text' as const, required: true },
				{
					key: 'severity',
					label: 'Severity',
					type: 'select' as const,
					options: ['High', 'Low']
				}
			]
		};
		const result = validateCardFieldValues(schema, {
			title: 'Bug',
			severity: 'Medium'
		});
		expect(result.ok).toBe(false);
	});
});

describe('formatCardFieldValue', () => {
	it('truncates long text on the board face', () => {
		const text = 'a'.repeat(40);
		expect(formatCardFieldValue('long_text', text, { truncate: 20 })).toHaveLength(20);
		expect(formatCardFieldValue('long_text', text, { truncate: 20 }).endsWith('…')).toBe(true);
	});
});

describe('buildCardActivitySummary', () => {
	it('returns human-readable field changes', () => {
		const changes = buildCardActivitySummary(
			{ title: 'Old', body: null },
			{ title: 'New', body: 'Details' },
			DEFAULT_CARD_MODULE_SCHEMA
		);
		expect(changes).toEqual([
			{ label: 'Title', from: 'Old', to: 'New' },
			{ label: 'Description', from: '—', to: 'Details' }
		]);
	});
});

describe('primaryFieldTitle', () => {
	it('falls back when primary field is empty', () => {
		const config = resolveCardModuleConfig(null);
		expect(primaryFieldTitle(config, { title: '  ', body: null })).toBe('Untitled');
	});
});
