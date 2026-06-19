<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Dialog from '../../ui/dialog.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Tooltip from '../../ui/tooltip.svelte';
	import BookmarkToggle from '../../bookmarks/bookmark-toggle.svelte';
	import {
		orderedCardFields,
		serializeCardFieldValuesForForm,
		type CardFieldValues,
		type CardModuleConfig
	} from '$lib/shared/cards-schema';
	import CardsFieldInput from './cards-field-input.svelte';

	type Props = {
		open?: boolean;
		mode: 'create' | 'edit';
		config: CardModuleConfig;
		cardId?: string;
		columnId?: string;
		fieldValues?: CardFieldValues;
		fieldErrors?: Record<string, string>;
		onClose?: () => void;
	};

	let {
		open = $bindable(false),
		mode,
		config,
		cardId = '',
		columnId = '',
		fieldValues = {},
		fieldErrors = {},
		onClose
	}: Props = $props();

	let values = $state<CardFieldValues>({});

	$effect(() => {
		if (!open) return;
		const syncValues = fieldValues;
		untrack(() => {
			values = { ...syncValues };
		});
	});

	const dialogTitle = $derived(mode === 'create' ? 'New card' : 'Edit card');
	const submitAction = $derived(mode === 'create' ? '?/addCard' : '?/updateCard');
	const fields = $derived(orderedCardFields(config.schema, config.layout));

	const serializedValues = $derived(serializeCardFieldValuesForForm(values));

	const primaryKey = $derived(config.layout.primaryFieldKey);

	const allRequiredFilled = $derived.by(() => {
		for (const field of config.schema.fields) {
			if (!field.required) continue;
			const raw = values[field.key];
			if (raw === null || raw === undefined || String(raw).trim().length === 0) return false;
		}
		return true;
	});

	const canSave = $derived.by(() => {
		if (mode === 'create') return allRequiredFilled;
		return JSON.stringify(values) !== JSON.stringify(fieldValues);
	});

	const hasPrimaryValue = $derived.by(() => {
		const raw = values[primaryKey];
		return raw !== null && raw !== undefined && String(raw).trim().length > 0;
	});

	const bookmarkLabel = $derived(String(values[primaryKey] ?? 'Card'));

	function handleClose() {
		open = false;
		onClose?.();
	}

	function setFieldValue(key: string, value: string | number | null) {
		values = { ...values, [key]: value };
	}
</script>

<Dialog bind:open title={dialogTitle} size="lg" onOpenChange={(value) => !value && handleClose()}>
	{#if mode === 'edit'}
		<BookmarkToggle
			targetType="boardCard"
			targetId={cardId}
			label={bookmarkLabel}
			size={16}
			class="absolute top-4 right-14 z-10 size-8 rounded-md"
		/>
	{/if}
	<form
		method="POST"
		action={submitAction}
		use:enhance={({ submitter, cancel }) => {
			const action = submitter?.getAttribute('formaction') ?? '';
			const isDelete = action.includes('deleteCard');

			if (!isDelete && !allRequiredFilled) {
				cancel();
				return;
			}

			return async ({ update }) => {
				await update();
				handleClose();
			};
		}}
		class="flex h-full min-h-0 flex-col"
	>
		{#if mode === 'create'}
			<input type="hidden" name="columnId" value={columnId} />
		{:else}
			<input type="hidden" name="cardId" value={cardId} />
		{/if}
		<input type="hidden" name="fieldValues" value={serializedValues} />

		<div class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
			{#each fields as field (field.key)}
				<CardsFieldInput
					{field}
					value={values[field.key] ?? null}
					error={fieldErrors[field.key]}
					onchange={(value) => setFieldValue(field.key, value)}
				/>
			{/each}
		</div>

		<div
			class="border-border mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-4"
		>
			{#if mode === 'edit'}
				<Tooltip text="Permanently delete this card">
					{#snippet trigger(props)}
						<span {...props} class="inline-flex">
							<ButtonUi
								type="submit"
								formaction="?/deleteCard"
								formmethod="POST"
								formnovalidate
								variant="ghost"
								class="text-danger hover:bg-danger-muted"
							>
								Delete
							</ButtonUi>
						</span>
					{/snippet}
				</Tooltip>
			{:else}
				<span></span>
			{/if}
			<div class="flex gap-2">
				<ButtonUi type="button" variant="secondary" onclick={handleClose}>Cancel</ButtonUi>
				<ButtonUi type="submit" disabled={!canSave}>
					{mode === 'create' ? 'Create' : 'Save'}
				</ButtonUi>
			</div>
		</div>
	</form>
</Dialog>
