import type { CardActivityChange } from './activity';

export const CARD_FIELD_TYPES = [
	'short_text',
	'long_text',
	'select',
	'date',
	'number',
	'url'
] as const;

export type CardFieldType = (typeof CARD_FIELD_TYPES)[number];

export type CardFieldDefinition = {
	key: string;
	label: string;
	type: CardFieldType;
	required?: boolean;
	options?: string[];
};

export type CardModuleSchema = {
	fields: CardFieldDefinition[];
};

export type CardModuleLayout = {
	primaryFieldKey: string;
	faceFieldKeys: string[];
};

export type CardFieldValues = Record<string, string | number | null>;

export type CardModuleSettingsData = {
	schema: CardModuleSchema;
	layout: CardModuleLayout;
};

export type CardModuleConfig = CardModuleSettingsData & {
	isCustom: boolean;
};

export type CardFieldValidationError = {
	key: string;
	message: string;
};

export type CardSchemaValidationResult = {
	ok: boolean;
	errors: string[];
};

export type CardFieldValuesValidationResult = {
	ok: boolean;
	fieldErrors: CardFieldValidationError[];
	values: CardFieldValues;
};

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export const DEFAULT_CARD_MODULE_SCHEMA: CardModuleSchema = {
	fields: [
		{ key: 'title', label: 'Title', type: 'short_text', required: true },
		{ key: 'body', label: 'Description', type: 'long_text', required: false }
	]
};

export const DEFAULT_CARD_MODULE_LAYOUT: CardModuleLayout = {
	primaryFieldKey: 'title',
	faceFieldKeys: ['title', 'body']
};

export function isCardFieldType(value: string): value is CardFieldType {
	return CARD_FIELD_TYPES.includes(value as CardFieldType);
}

export function resolveCardModuleConfig(
	settings: CardModuleSettingsData | null | undefined
): CardModuleConfig {
	if (!settings) {
		return {
			isCustom: false,
			schema: DEFAULT_CARD_MODULE_SCHEMA,
			layout: DEFAULT_CARD_MODULE_LAYOUT
		};
	}
	return {
		isCustom: true,
		schema: settings.schema,
		layout: settings.layout
	};
}

export function getCardFieldDefinition(
	schema: CardModuleSchema,
	key: string
): CardFieldDefinition | undefined {
	return schema.fields.find((field) => field.key === key);
}

export function orderedCardFields(
	schema: CardModuleSchema,
	layout: CardModuleLayout
): CardFieldDefinition[] {
	const seen = new Set<string>();
	const ordered: CardFieldDefinition[] = [];

	for (const key of layout.faceFieldKeys) {
		const field = getCardFieldDefinition(schema, key);
		if (field && !seen.has(key)) {
			ordered.push(field);
			seen.add(key);
		}
	}

	for (const field of schema.fields) {
		if (!seen.has(field.key)) {
			ordered.push(field);
			seen.add(field.key);
		}
	}

	return ordered;
}

export function validateCardModuleSchema(
	schema: CardModuleSchema,
	layout: CardModuleLayout
): CardSchemaValidationResult {
	const errors: string[] = [];

	if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
		errors.push('At least one field is required');
		return { ok: false, errors };
	}

	const keys = new Set<string>();
	for (const field of schema.fields) {
		if (!field.key?.trim()) {
			errors.push('Each field needs a key');
			continue;
		}
		if (!FIELD_KEY_PATTERN.test(field.key)) {
			errors.push(`Field key "${field.key}" must be lowercase letters, numbers, and underscores`);
		}
		if (keys.has(field.key)) {
			errors.push(`Duplicate field key "${field.key}"`);
		}
		keys.add(field.key);

		if (!field.label?.trim()) {
			errors.push(`Field "${field.key}" needs a label`);
		}
		if (!isCardFieldType(field.type)) {
			errors.push(`Field "${field.key}" has an invalid type`);
		}
		if (field.type === 'select') {
			const options = field.options?.filter((option) => option.trim()) ?? [];
			if (options.length === 0) {
				errors.push(`Select field "${field.key}" needs at least one option`);
			}
		}
	}

	const primary = getCardFieldDefinition(schema, layout.primaryFieldKey);
	if (!primary) {
		errors.push('Primary field must exist in the schema');
	} else if (primary.type !== 'short_text') {
		errors.push('Primary field must be short text');
	}

	for (const key of layout.faceFieldKeys) {
		if (!keys.has(key)) {
			errors.push(`Face field "${key}" is not in the schema`);
		}
	}

	return { ok: errors.length === 0, errors };
}

function normalizeFieldValue(raw: unknown): string | number | null {
	if (raw === null || raw === undefined) return null;
	if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	return null;
}

function validateSingleFieldValue(
	field: CardFieldDefinition,
	raw: unknown
): { value: string | number | null; error?: string } {
	const normalized = normalizeFieldValue(raw);

	if (field.required && normalized === null) {
		return { value: null, error: `${field.label} is required` };
	}
	if (normalized === null) {
		return { value: null };
	}

	switch (field.type) {
		case 'short_text':
		case 'long_text':
			return { value: String(normalized) };
		case 'select': {
			const options = field.options?.filter((option) => option.trim()) ?? [];
			const value = String(normalized);
			if (!options.includes(value)) {
				return { value: null, error: `${field.label} must be one of the allowed options` };
			}
			return { value };
		}
		case 'date': {
			const value = String(normalized);
			if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
				return { value: null, error: `${field.label} must be a valid date` };
			}
			const parsed = new Date(`${value}T00:00:00.000Z`);
			if (Number.isNaN(parsed.getTime())) {
				return { value: null, error: `${field.label} must be a valid date` };
			}
			return { value };
		}
		case 'number': {
			const num = typeof raw === 'number' ? raw : Number(String(normalized));
			if (!Number.isFinite(num)) {
				return { value: null, error: `${field.label} must be a number` };
			}
			return { value: num };
		}
		case 'url': {
			const value = String(normalized);
			try {
				const url = new URL(value.includes('://') ? value : `https://${value}`);
				if (!url.hostname) {
					return { value: null, error: `${field.label} must be a valid URL` };
				}
				return { value: url.toString() };
			} catch {
				return { value: null, error: `${field.label} must be a valid URL` };
			}
		}
		default:
			return { value: String(normalized) };
	}
}

export function validateCardFieldValues(
	schema: CardModuleSchema,
	rawValues: Record<string, unknown>
): CardFieldValuesValidationResult {
	const fieldErrors: CardFieldValidationError[] = [];
	const values: CardFieldValues = {};

	for (const field of schema.fields) {
		const result = validateSingleFieldValue(field, rawValues[field.key]);
		if (result.error) {
			fieldErrors.push({ key: field.key, message: result.error });
		}
		values[field.key] = result.value;
	}

	return { ok: fieldErrors.length === 0, fieldErrors, values };
}

export function cardFieldValuesFromBoardRow(
	config: CardModuleConfig,
	row: { title: string; body: string; fieldValues?: CardFieldValues | null }
): CardFieldValues {
	if (!config.isCustom) {
		return { title: row.title, body: row.body || null };
	}

	const parsed = row.fieldValues ?? {};
	const values: CardFieldValues = {};
	for (const field of config.schema.fields) {
		if (Object.prototype.hasOwnProperty.call(parsed, field.key)) {
			values[field.key] = parsed[field.key] ?? null;
		} else if (field.key === 'title') {
			values[field.key] = row.title;
		} else if (field.key === 'body') {
			values[field.key] = row.body || null;
		} else {
			values[field.key] = null;
		}
	}
	return values;
}

export function primaryFieldTitle(
	config: CardModuleConfig,
	values: CardFieldValues,
	fallback = 'Untitled'
): string {
	const primaryKey = config.layout.primaryFieldKey;
	const raw = values[primaryKey];
	if (raw === null || raw === undefined) return fallback;
	const text = String(raw).trim();
	return text || fallback;
}

export function boardRowFromFieldValues(
	config: CardModuleConfig,
	values: CardFieldValues
): { title: string; body: string; fieldValues: CardFieldValues | null } {
	const title = primaryFieldTitle(config, values);
	const bodyField = getCardFieldDefinition(config.schema, 'body');
	const bodyRaw = bodyField ? values.body : null;
	const body = bodyRaw === null || bodyRaw === undefined ? '' : String(bodyRaw);

	return {
		title,
		body,
		fieldValues: config.isCustom ? values : null
	};
}

export function formatCardFieldValue(
	type: CardFieldType,
	value: string | number | null,
	options?: { truncate?: number }
): string {
	if (value === null || value === undefined || value === '') return '';

	let text = '';
	switch (type) {
		case 'number':
			text = String(value);
			break;
		case 'date': {
			const date = new Date(`${String(value)}T00:00:00.000Z`);
			text = Number.isNaN(date.getTime())
				? String(value)
				: date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
			break;
		}
		default:
			text = String(value);
	}

	const truncate = options?.truncate;
	if (truncate && text.length > truncate) {
		return `${text.slice(0, truncate - 1)}…`;
	}
	return text;
}

export function parseCardFieldValuesFromForm(
	formData: FormData,
	schema: CardModuleSchema
): Record<string, unknown> {
	const raw: Record<string, unknown> = {};
	const json = formData.get('fieldValues')?.toString()?.trim();
	if (json) {
		try {
			const parsed = JSON.parse(json) as Record<string, unknown>;
			if (parsed && typeof parsed === 'object') {
				for (const field of schema.fields) {
					if (Object.prototype.hasOwnProperty.call(parsed, field.key)) {
						raw[field.key] = parsed[field.key];
					}
				}
				return raw;
			}
		} catch {
			// fall through to per-field inputs
		}
	}

	for (const field of schema.fields) {
		const value = formData.get(`field.${field.key}`);
		if (value !== null && value !== undefined) {
			raw[field.key] = value.toString();
		}
	}
	return raw;
}

export function parseDefaultCardFromForm(formData: FormData): Record<string, unknown> {
	return {
		title: formData.get('title')?.toString() ?? '',
		body: formData.get('body')?.toString() ?? ''
	};
}

export function serializeCardFieldValuesForForm(values: CardFieldValues): string {
	return JSON.stringify(values);
}

export function buildCardActivitySummary(
	oldValues: CardFieldValues,
	newValues: CardFieldValues,
	schema: CardModuleSchema
): CardActivityChange[] {
	const changes: CardActivityChange[] = [];

	for (const field of schema.fields) {
		const fromRaw = oldValues[field.key];
		const toRaw = newValues[field.key];
		const from = formatCardFieldValue(field.type, fromRaw ?? null) || '—';
		const to = formatCardFieldValue(field.type, toRaw ?? null) || '—';
		if (from !== to) {
			changes.push({ label: field.label, from, to });
		}
	}

	return changes;
}

export function parseCardModuleSettingsJson(raw: {
	schema: string;
	layout: string;
}): CardModuleSettingsData | null {
	try {
		const schema = JSON.parse(raw.schema) as CardModuleSchema;
		const layout = JSON.parse(raw.layout) as CardModuleLayout;
		const validation = validateCardModuleSchema(schema, layout);
		if (!validation.ok) return null;
		return { schema, layout };
	} catch {
		return null;
	}
}

export function serializeCardModuleSettings(data: CardModuleSettingsData): {
	schema: string;
	layout: string;
} {
	return {
		schema: JSON.stringify(data.schema),
		layout: JSON.stringify(data.layout)
	};
}

export function serializeCardFieldValues(values: CardFieldValues | null | undefined): string {
	return JSON.stringify(values ?? {});
}

export function parseCardFieldValuesJson(raw: string | null | undefined): CardFieldValues {
	if (!raw?.trim()) return {};
	try {
		const parsed = JSON.parse(raw) as CardFieldValues;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

export function generateCardFieldKey(label: string, existingKeys: Set<string>): string {
	const base = label
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.replace(/_+/g, '_');

	let key = base.match(FIELD_KEY_PATTERN) ? base : `field_${base || 'new'}`;
	if (!FIELD_KEY_PATTERN.test(key)) {
		key = 'field_new';
	}

	let candidate = key;
	let index = 2;
	while (existingKeys.has(candidate)) {
		candidate = `${key}_${index}`;
		index += 1;
	}
	return candidate;
}
