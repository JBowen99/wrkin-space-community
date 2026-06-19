import { describe, expect, it } from 'vitest';
import { parseSetupCardsFromForm } from './cards-setup.ts';

describe('parseSetupCardsFromForm', () => {
	it('parses template id and sample content flag', () => {
		const formData = new FormData();
		formData.set('templateId', 'kanban-simple');
		formData.set('includeSampleContent', 'true');

		expect(parseSetupCardsFromForm(formData)).toEqual({
			templateId: 'kanban-simple',
			includeSampleContent: true
		});
	});

	it('treats missing sample flag as true', () => {
		const formData = new FormData();
		formData.set('templateId', 'bug-triage');

		expect(parseSetupCardsFromForm(formData)?.includeSampleContent).toBe(true);
	});

	it('parses includeSampleContent=false', () => {
		const formData = new FormData();
		formData.set('templateId', 'bug-triage');
		formData.set('includeSampleContent', 'false');

		expect(parseSetupCardsFromForm(formData)).toEqual({
			templateId: 'bug-triage',
			includeSampleContent: false
		});
	});

	it('returns null when template id is missing', () => {
		expect(parseSetupCardsFromForm(new FormData())).toBeNull();
	});
});
