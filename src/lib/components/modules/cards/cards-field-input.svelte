<script lang="ts">
	import Label from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import Textarea from '../../ui/textarea.svelte';
	import Select from '../../ui/select.svelte';
	import type { CardFieldDefinition, CardFieldType } from '$lib/shared/cards-schema';

	type Props = {
		field: CardFieldDefinition;
		value?: string | number | null;
		error?: string;
		idPrefix?: string;
		onchange?: (value: string | number | null) => void;
	};

	let { field, value = null, error, idPrefix = 'card-field', onchange }: Props = $props();

	const inputId = $derived(`${idPrefix}-${field.key}`);

	let textValue = $state('');
	let numberValue = $state('');

	$effect(() => {
		if (field.type === 'number') {
			numberValue = value === null || value === undefined ? '' : String(value);
		} else {
			textValue = value === null || value === undefined ? '' : String(value);
		}
	});

	function emitText(next: string) {
		textValue = next;
		onchange?.(next.trim() ? next : null);
	}

	function emitNumber(next: string) {
		numberValue = next;
		if (!next.trim()) {
			onchange?.(null);
			return;
		}
		const parsed = Number(next);
		onchange?.(Number.isFinite(parsed) ? parsed : null);
	}

	const selectOptions = $derived(
		(field.options ?? []).map((option) => ({ value: option, label: option }))
	);
</script>

<div>
	<Label for={inputId}>{field.label}{field.required ? ' *' : ''}</Label>
	{#if field.type === 'long_text'}
		<Textarea
			id={inputId}
			rows={6}
			bind:value={textValue}
			oninput={() => emitText(textValue)}
			placeholder={field.label}
			required={field.required}
			class="resize-y"
		/>
	{:else if field.type === 'select'}
		<Select
			id={inputId}
			value={textValue}
			options={selectOptions}
			placeholder={`Select ${field.label.toLowerCase()}…`}
			required={field.required}
			onValueChange={(next) => emitText(next)}
		/>
	{:else if field.type === 'date'}
		<Input
			id={inputId}
			type="date"
			bind:value={textValue}
			oninput={() => emitText(textValue)}
			required={field.required}
		/>
	{:else if field.type === 'number'}
		<Input
			id={inputId}
			type="number"
			bind:value={numberValue}
			oninput={() => emitNumber(numberValue)}
			required={field.required}
		/>
	{:else if field.type === 'url'}
		<Input
			id={inputId}
			type="url"
			bind:value={textValue}
			oninput={() => emitText(textValue)}
			placeholder="https://…"
			required={field.required}
		/>
	{:else}
		<Input
			id={inputId}
			bind:value={textValue}
			oninput={() => emitText(textValue)}
			placeholder={field.label}
			required={field.required}
		/>
	{/if}
	{#if error}
		<p class="text-danger mt-1 text-xs">{error}</p>
	{/if}
</div>
