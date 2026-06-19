<script lang="ts">
	import Label from '../ui/label.svelte';
	import SingleCombobox from '../ui/single-combobox.svelte';
	import TemplatePreviewMeta from './template-preview-meta.svelte';

	export type TemplatePickerItem = {
		id: string;
		name: string;
		description: string;
		includesSampleContent?: boolean;
		moduleLabels?: string[];
		detailLines?: string[];
	};

	type Props = {
		items: TemplatePickerItem[];
		value?: string;
		name?: string;
		label?: string;
		placeholder?: string;
		id?: string;
	};

	let {
		items,
		value = $bindable('blank'),
		name = 'templateId',
		label = 'Start from a template',
		placeholder = 'Search templates…',
		id = 'template-picker'
	}: Props = $props();

	const options = $derived(
		items.map((item) => ({
			value: item.id,
			label: item.name,
			keywords: [item.description, ...(item.moduleLabels ?? []), ...(item.detailLines ?? [])].join(
				' '
			)
		}))
	);

	const selectedItem = $derived(items.find((item) => item.id === value));
</script>

<div class="space-y-2">
	<Label for={id}>{label}</Label>
	<SingleCombobox {id} bind:value {options} {placeholder} ariaLabel={label} />
	<input type="hidden" {name} {value} />

	{#if selectedItem}
		<div class="border-border bg-surface/50 rounded-lg border px-3 py-2">
			<p class="text-ink-muted text-sm">{selectedItem.description}</p>
			<TemplatePreviewMeta
				includesSampleContent={selectedItem.includesSampleContent}
				moduleLabels={selectedItem.moduleLabels}
				detailLines={selectedItem.detailLines}
			/>
		</div>
	{/if}
</div>
