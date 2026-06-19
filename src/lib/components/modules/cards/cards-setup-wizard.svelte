<script lang="ts">
	import { enhance } from '$app/forms';
	import { cardColumnHeaderStyle } from '$lib/shared/cards';
	import type { CardsPresetOption } from '$lib/shared/templates';
	import ButtonUi from '../../ui/button.svelte';
	import Checkbox from '../../ui/checkbox.svelte';
	import Label from '../../ui/label.svelte';
	import Select from '../../ui/select.svelte';
	import Badge from '../../ui/badge.svelte';

	type Props = {
		moduleTitle: string;
		presetOptions: readonly CardsPresetOption[];
	};

	let { moduleTitle, presetOptions }: Props = $props();

	let selectedTemplateId = $state('');
	let includeSampleContent = $state(true);

	const presetSelectOptions = $derived(
		presetOptions.map((option) => ({ value: option.id, label: option.name }))
	);

	const selectedOption = $derived(presetOptions.find((option) => option.id === selectedTemplateId));

	const hasCustomFields = $derived((selectedOption?.fieldLabels.length ?? 0) > 0);
	const hasColumns = $derived((selectedOption?.columnTitles.length ?? 0) > 0);

	$effect(() => {
		if (presetOptions.length > 0 && !selectedTemplateId) {
			selectPreset(presetOptions[0].id);
		}
	});

	function selectPreset(id: string) {
		selectedTemplateId = id;
		const option = presetOptions.find((item) => item.id === id);
		includeSampleContent = option?.includesSampleContent ?? false;
	}
</script>

<div class="mx-auto mt-6 flex w-full max-w-lg flex-col items-center px-4">
	<div class="w-full text-center">
		<h2 class="text-ink text-lg font-semibold">Choose a board preset</h2>
		<p class="text-ink-muted mx-auto mt-2 max-w-md text-sm">
			Pick a starting layout for {moduleTitle}. You can customize columns and card fields after
			setup.
		</p>
	</div>

	<form method="POST" action="?/setupCards" use:enhance class="mt-8 w-full space-y-4">
		<input type="hidden" name="templateId" value={selectedTemplateId} />
		<input
			type="hidden"
			name="includeSampleContent"
			value={includeSampleContent ? 'true' : 'false'}
		/>

		<div class="text-left">
			<Label for="cards-preset-select">Board preset</Label>
			<Select
				id="cards-preset-select"
				value={selectedTemplateId}
				options={presetSelectOptions}
				placeholder="Select a preset…"
				onValueChange={selectPreset}
			/>
		</div>

		{#if selectedOption}
			<div class="border-border bg-surface-raised rounded-xl border p-4 text-left">
				<p class="text-ink font-medium">{selectedOption.name}</p>
				<p class="text-ink-muted mt-1 text-sm">{selectedOption.headline}</p>
				<p class="text-ink-muted mt-3 text-sm">{selectedOption.description}</p>

				<div class="mt-4 space-y-3">
					{#if hasColumns}
						<div>
							<p class="text-ink-muted text-xs font-medium tracking-wide uppercase">Columns</p>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each selectedOption.columnTitles as column (column.title)}
									<span
										class="text-ink inline-flex rounded-md border px-2.5 py-1 text-xs font-medium"
										style={cardColumnHeaderStyle(column.color)}
									>
										{column.title}
									</span>
								{/each}
							</div>
						</div>
					{:else}
						<p class="text-ink-muted text-sm">No columns — add your own workflow after setup.</p>
					{/if}

					{#if hasCustomFields}
						<div>
							<p class="text-ink-muted text-xs font-medium tracking-wide uppercase">Card fields</p>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each selectedOption.fieldLabels as label (label)}
									<Badge variant="neutral">{label}</Badge>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			{#if selectedOption.includesSampleContent}
				<label
					class="border-border bg-surface-raised flex items-start gap-3 rounded-xl border px-4 py-3 text-left"
				>
					<Checkbox
						checked={includeSampleContent}
						onCheckedChange={(checked) => (includeSampleContent = checked)}
					/>
					<span class="text-sm">
						<span class="text-ink font-medium">Include sample cards</span>
						<span class="text-ink-muted mt-0.5 block">
							Add starter cards so you can see the board in action right away.
						</span>
					</span>
				</label>
			{/if}
		{/if}

		<div class="flex justify-center pt-2">
			<ButtonUi type="submit" class="min-w-36" disabled={!selectedTemplateId}>Create board</ButtonUi
			>
		</div>
	</form>
</div>
