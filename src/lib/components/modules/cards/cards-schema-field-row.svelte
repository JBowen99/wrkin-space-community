<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowDown01Icon, ArrowUp01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
	import LabelUi from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import Select from '../../ui/select.svelte';
	import { Label, RadioGroup, useId } from 'bits-ui';
	import Checkbox from '../../ui/checkbox.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import IconButton from '../../ui/icon-button.svelte';
	import CardsSelectOptionsEditor from './cards-select-options-editor.svelte';
	import {
		CARD_FIELD_TYPES,
		type CardFieldDefinition,
		type CardFieldType
	} from '$lib/shared/cards-schema';

	type Props = {
		field: CardFieldDefinition;
		index: number;
		total: number;
		showOnFace: boolean;
		canRemove: boolean;
		onFaceChange?: (show: boolean) => void;
		onRemove?: () => void;
		onMoveUp?: () => void;
		onMoveDown?: () => void;
		onUpdate?: (field: CardFieldDefinition) => void;
	};

	let {
		field,
		index,
		total,
		showOnFace,
		canRemove,
		onFaceChange,
		onRemove,
		onMoveUp,
		onMoveDown,
		onUpdate
	}: Props = $props();

	const TYPE_LABELS: Record<CardFieldType, string> = {
		short_text: 'Short text',
		long_text: 'Long text',
		select: 'Single select',
		date: 'Date',
		number: 'Number',
		url: 'URL'
	};

	const typeOptions = CARD_FIELD_TYPES.map((type) => ({
		value: type,
		label: TYPE_LABELS[type]
	}));

	function updateField(partial: Partial<CardFieldDefinition>) {
		onUpdate?.({ ...field, ...partial });
	}

	function handleLabelInput(value: string) {
		updateField({ label: value });
	}

	function handleTypeChange(type: string) {
		const nextType = type as CardFieldType;
		updateField({
			type: nextType,
			options: nextType === 'select' ? (field.options ?? ['Option 1']) : undefined
		});
	}

	const canMoveUp = $derived(index > 0);
	const canMoveDown = $derived(index < total - 1);

	const iconButtonClass =
		'flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted/60 text-ink-muted transition hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-40';

	const primaryRadioClass =
		'size-4 shrink-0 rounded-full border border-border bg-surface-raised transition hover:border-accent/40 data-[state=checked]:border-[5px] data-[state=checked]:border-accent';

	const canBePrimary = $derived(field.type === 'short_text');
	const primaryRadioId = useId();
</script>

<div class="space-y-4">
	<div class="flex items-start gap-3">
		<div class="grid min-w-0 flex-1 gap-4 md:grid-cols-2">
			<div>
				<LabelUi for={`field-label-${field.key}`}>Label</LabelUi>
				<Input
					id={`field-label-${field.key}`}
					value={field.label}
					oninput={(event) => handleLabelInput(event.currentTarget.value)}
				/>
			</div>
			<div>
				<LabelUi for={`field-type-${field.key}`}>Type</LabelUi>
				<Select
					id={`field-type-${field.key}`}
					value={field.type}
					options={typeOptions}
					onValueChange={handleTypeChange}
				/>
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-1 self-end">
			<ButtonUi
				type="button"
				variant="unstyled"
				class={iconButtonClass}
				disabled={!canMoveUp}
				onclick={() => onMoveUp?.()}
				aria-label="Move field up"
			>
				<HugeiconsIcon
					icon={ArrowUp01Icon}
					size={16}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
			<ButtonUi
				type="button"
				variant="unstyled"
				class={iconButtonClass}
				disabled={!canMoveDown}
				onclick={() => onMoveDown?.()}
				aria-label="Move field down"
			>
				<HugeiconsIcon
					icon={ArrowDown01Icon}
					size={16}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</ButtonUi>
			{#if canRemove}
				<IconButton
					label="Remove field"
					size="md"
					variant="destructive"
					onclick={() => onRemove?.()}
				>
					<HugeiconsIcon
						icon={Delete02Icon}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</IconButton>
			{/if}
		</div>
	</div>

	{#if field.type === 'select'}
		<CardsSelectOptionsEditor
			id={`field-options-${field.key}`}
			options={field.options ?? []}
			onchange={(options) => updateField({ options })}
		/>
	{/if}

	<div class="border-border flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-3 text-sm">
		<label class="inline-flex items-center gap-2">
			<Checkbox
				checked={field.required ?? false}
				onCheckedChange={(checked) => updateField({ required: checked })}
			/>
			<span>Required</span>
		</label>
		{#if canBePrimary}
			<div class="inline-flex items-center gap-2">
				<RadioGroup.Item id={primaryRadioId} value={field.key} class={primaryRadioClass} />
				<Label.Root for={primaryRadioId} class="cursor-pointer text-sm">Primary title</Label.Root>
			</div>
		{/if}
		<label class="inline-flex items-center gap-2">
			<Checkbox checked={showOnFace} onCheckedChange={(checked) => onFaceChange?.(checked)} />
			<span>Show on board</span>
		</label>
	</div>
</div>
