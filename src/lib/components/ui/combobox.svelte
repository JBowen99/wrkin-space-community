<script lang="ts">
	import { Combobox } from 'bits-ui';
	import { cn } from '../../cn';
	import { iconButtonClass } from '../../icon-button-styles';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';

	type Option = { value: string; label: string };

	type ExtraChip = {
		id: string;
		label: string;
		onRemove: () => void;
	};

	type Props = {
		id?: string;
		value?: string[];
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		emptyMessage?: string;
		hideChips?: boolean;
		/** Called when the user chooses to create from the current search query. */
		onCreateFromSearch?: (query: string) => void;
		createLabel?: (query: string) => string;
		extraChips?: ExtraChip[];
		class?: string;
	};

	let {
		id,
		value = $bindable<string[]>([]),
		options,
		placeholder = 'Search…',
		disabled = false,
		emptyMessage = 'No results found.',
		hideChips = false,
		onCreateFromSearch,
		createLabel = (query) => `Create "${query}"`,
		extraChips = [],
		class: className = ''
	}: Props = $props();

	let searchValue = $state('');

	const trimmedSearch = $derived(searchValue.trim());

	const filteredOptions = $derived(
		searchValue === ''
			? options
			: options.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
	);

	const showCreateOption = $derived(
		!!onCreateFromSearch && trimmedSearch.length > 0 && filteredOptions.length === 0
	);

	const hasChips = $derived(value.length > 0 || extraChips.length > 0);

	const labelByValue = $derived(new Map(options.map((option) => [option.value, option.label])));

	function removeValue(itemValue: string) {
		value = value.filter((v) => v !== itemValue);
	}

	function handleCreateFromSearch() {
		if (!onCreateFromSearch || !trimmedSearch) return;
		onCreateFromSearch(trimmedSearch);
		searchValue = '';
	}

	const inputClass =
		'h-11 w-full rounded-lg border border-border bg-surface-raised py-2 pl-3 pr-12 text-sm text-ink placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none disabled:opacity-50';

	const triggerClass =
		'absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface-hover hover:text-ink';

	const itemClass =
		'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-hover data-[highlighted]:bg-surface-muted data-[state=checked]:bg-accent-muted data-[state=checked]:text-accent';

	const chipClass =
		'inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-surface-muted py-1 pr-1 pl-2.5 text-sm text-ink';

	const chipRemoveClass = iconButtonClass('sm', 'subtle');
</script>

<div class={className}>
	<Combobox.Root
		type="multiple"
		{disabled}
		bind:value={value as never}
		items={options}
		onOpenChangeComplete={(open) => {
			if (!open) searchValue = '';
		}}
	>
		<div class="relative">
			<Combobox.Input
				{id}
				{placeholder}
				aria-label={placeholder}
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck={false}
				data-1p-ignore
				data-lpignore="true"
				oninput={(event) => (searchValue = event.currentTarget.value)}
				class={inputClass}
			/>
			<Combobox.Trigger class={triggerClass} aria-label="Show options">
				<span aria-hidden="true">▾</span>
			</Combobox.Trigger>
		</div>

		{#if hasChips && !hideChips}
			<ul class="mt-2 flex flex-wrap gap-2" aria-label="Selected items">
				{#each value as itemValue (itemValue)}
					{@const label = labelByValue.get(itemValue) ?? itemValue}
					<li>
						<span class={chipClass}>
							<span class="truncate">{label}</span>
							<button
								type="button"
								class={chipRemoveClass}
								aria-label="Remove {label}"
								onclick={() => removeValue(itemValue)}
							>
								<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
							</button>
						</span>
					</li>
				{/each}
				{#each extraChips as chip (chip.id)}
					<li>
						<span class={chipClass}>
							<span class="truncate">{chip.label}</span>
							<button
								type="button"
								class={chipRemoveClass}
								aria-label="Remove {chip.label}"
								onclick={chip.onRemove}
							>
								<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
							</button>
						</span>
					</li>
				{/each}
			</ul>
		{/if}

		<Combobox.Portal>
			<Combobox.Content
				class="border-border bg-surface-raised z-50 max-h-60 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] overflow-y-auto rounded-lg border p-1 shadow-md"
				sideOffset={4}
			>
				{#if showCreateOption}
					<button
						type="button"
						class={cn(itemClass, 'w-full text-left')}
						onclick={handleCreateFromSearch}
					>
						<span class="truncate">{createLabel(trimmedSearch)}</span>
					</button>
				{/if}
				{#each filteredOptions as option (option.value)}
					<Combobox.Item value={option.value} label={option.label} class={itemClass}>
						{#snippet children({ selected })}
							<span class="truncate">{option.label}</span>
							{#if selected}
								<span class="text-accent shrink-0" aria-hidden="true">✓</span>
							{/if}
						{/snippet}
					</Combobox.Item>
				{:else}
					{#if !showCreateOption}
						<p class="px-3 py-2 text-sm text-ink-muted">{emptyMessage}</p>
					{/if}
				{/each}
			</Combobox.Content>
		</Combobox.Portal>
	</Combobox.Root>
</div>
