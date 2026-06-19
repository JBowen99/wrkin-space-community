<script lang="ts">
	import { untrack } from 'svelte';
	import { RadioGroup } from 'bits-ui';
	import { enhance } from '$app/forms';
	import Dialog from '../../ui/dialog.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Card from '../../ui/card.svelte';
	import {
		generateCardFieldKey,
		validateCardModuleSchema,
		type CardFieldDefinition,
		type CardModuleConfig,
		type CardModuleLayout,
		type CardModuleSchema
	} from '$lib/shared/cards-schema';
	import CardsSchemaFieldRow from './cards-schema-field-row.svelte';

	type Props = {
		open?: boolean;
		config: CardModuleConfig;
		onClose?: () => void;
	};

	let { open = $bindable(false), config, onClose }: Props = $props();

	let fields = $state<CardFieldDefinition[]>([]);
	let primaryFieldKey = $state('title');
	let faceFieldKeys = $state<string[]>([]);

	$effect(() => {
		if (!open) return;

		untrack(() => {
			fields = config.schema.fields.map((field) => ({
				...field,
				options: field.options ? [...field.options] : undefined
			}));
			primaryFieldKey = config.layout.primaryFieldKey;
			faceFieldKeys = [...config.layout.faceFieldKeys];
			ensureValidPrimary();
		});
	});

	function handleClose() {
		open = false;
		onClose?.();
	}

	function ensureValidPrimary() {
		const primary = fields.find((field) => field.key === primaryFieldKey);
		if (primary?.type === 'short_text') return;

		const fallback = fields.find((field) => field.type === 'short_text');
		if (!fallback) return;

		primaryFieldKey = fallback.key;
		if (!faceFieldKeys.includes(fallback.key)) {
			faceFieldKeys = [fallback.key, ...faceFieldKeys];
		}
	}

	function addField() {
		const keys = new Set(fields.map((field) => field.key));
		const key = generateCardFieldKey('New field', keys);
		fields = [...fields, { key, label: 'New field', type: 'short_text', required: false }];
	}

	function updateField(index: number, next: CardFieldDefinition) {
		fields = fields.map((field, i) => (i === index ? next : field));
		ensureValidPrimary();
	}

	function removeField(index: number) {
		const removed = fields[index];
		if (!removed) return;
		fields = fields.filter((_, i) => i !== index);
		if (primaryFieldKey === removed.key) {
			primaryFieldKey =
				fields.find((field) => field.type === 'short_text')?.key ?? fields[0]?.key ?? '';
		}
		faceFieldKeys = faceFieldKeys.filter((key) => key !== removed.key);
	}

	function moveField(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= fields.length) return;
		const next = [...fields];
		const [item] = next.splice(index, 1);
		next.splice(target, 0, item);
		fields = next;
	}

	function setPrimary(key: string) {
		primaryFieldKey = key;
		if (!faceFieldKeys.includes(key)) {
			faceFieldKeys = [key, ...faceFieldKeys];
		}
	}

	function setFace(key: string, show: boolean) {
		if (show) {
			if (!faceFieldKeys.includes(key)) faceFieldKeys = [...faceFieldKeys, key];
		} else if (key !== primaryFieldKey) {
			faceFieldKeys = faceFieldKeys.filter((item) => item !== key);
		}
	}

	const schema = $derived({ fields } satisfies CardModuleSchema);
	const layout = $derived({
		primaryFieldKey,
		faceFieldKeys: faceFieldKeys.length > 0 ? faceFieldKeys : [primaryFieldKey]
	} satisfies CardModuleLayout);

	const schemaValidation = $derived.by(() => validateCardModuleSchema(schema, layout));

	const hasSettingsChanges = $derived.by(
		() =>
			JSON.stringify(schema) !== JSON.stringify(config.schema) ||
			JSON.stringify(layout) !== JSON.stringify(config.layout)
	);

	const canSave = $derived(schemaValidation.ok && hasSettingsChanges);

	const primaryFieldLabel = $derived(
		fields.find((field) => field.key === primaryFieldKey)?.label ?? 'Title'
	);
</script>

<Dialog
	bind:open
	title="Card fields"
	description="Configure the shape of cards on this board — field types, board preview, and detail panel."
	size="xl"
	onOpenChange={(value) => !value && handleClose()}
>
	<form
		method="POST"
		action="?/updateCardModuleSettings"
		use:enhance={() => {
			return async ({ update }) => {
				if (!canSave) {
					return;
				}
				await update();
				handleClose();
			};
		}}
		class="flex h-full min-h-0 flex-col"
	>
		<input type="hidden" name="schema" value={JSON.stringify(schema)} />
		<input type="hidden" name="layout" value={JSON.stringify(layout)} />

		<div class="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
			<p class="text-ink-muted text-sm">
				Add fields, pick a <span class="text-ink font-medium">primary title</span> (short text only),
				and choose which values show on the board face. Detail-only fields appear when a card is opened.
			</p>

			<div class="flex items-center justify-between gap-3">
				<div>
					<h3 class="text-ink text-sm font-semibold">Fields</h3>
					<p class="text-ink-muted text-xs">
						{fields.length} field{fields.length === 1 ? '' : 's'} · primary:
						<span class="text-ink font-medium">{primaryFieldLabel}</span>
					</p>
				</div>
				<ButtonUi type="button" variant="secondary" onclick={addField}>Add field</ButtonUi>
			</div>

			<RadioGroup.Root
				value={primaryFieldKey}
				onValueChange={(key) => key && setPrimary(key)}
				class="space-y-3"
			>
				{#each fields as field, index (field.key)}
					<Card padding="compact">
						<CardsSchemaFieldRow
							{field}
							{index}
							total={fields.length}
							showOnFace={faceFieldKeys.includes(field.key)}
							canRemove={fields.length > 1}
							onFaceChange={(show) => setFace(field.key, show)}
							onRemove={() => removeField(index)}
							onMoveUp={() => moveField(index, -1)}
							onMoveDown={() => moveField(index, 1)}
							onUpdate={(next) => updateField(index, next)}
						/>
					</Card>
				{/each}
			</RadioGroup.Root>

			{#if schemaValidation.errors.length > 0}
				<div class="bg-danger-muted/40 rounded-lg px-4 py-3">
					<p class="text-danger text-sm font-medium">Fix these before saving</p>
					<ul class="text-danger mt-2 space-y-1 text-sm">
						{#each schemaValidation.errors as error}
							<li>{error}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<div class="border-border mt-4 flex shrink-0 items-center justify-end gap-2 border-t pt-4">
			<ButtonUi type="button" variant="secondary" onclick={handleClose}>Cancel</ButtonUi>
			<ButtonUi type="submit" disabled={!canSave}>Save</ButtonUi>
		</div>
	</form>
</Dialog>
