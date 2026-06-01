<script lang="ts">
	import { Combobox } from 'bits-ui';

	type Option = { value: string; label: string };

	type Props = {
		id?: string;
		value?: string[];
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		emptyMessage?: string;
		class?: string;
	};

	let {
		id,
		value = $bindable<string[]>([]),
		options,
		placeholder = 'Search…',
		disabled = false,
		emptyMessage = 'No results found.',
		class: className = ''
	}: Props = $props();

	let searchValue = $state('');

	const filteredOptions = $derived(
		searchValue === ''
			? options
			: options.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
	);

	const labelByValue = $derived(new Map(options.map((option) => [option.value, option.label])));

	function removeValue(itemValue: string) {
		value = value.filter((v) => v !== itemValue);
	}

	const inputClass =
		'h-11 w-full rounded-lg border border-border bg-surface-raised py-2 pl-3 pr-10 text-sm text-ink placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none disabled:opacity-50';

	const itemClass =
		'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-stone-50 data-[highlighted]:bg-stone-100 data-[state=checked]:bg-accent-muted data-[state=checked]:text-accent';
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
				oninput={(event) => (searchValue = event.currentTarget.value)}
				class={inputClass}
			/>
			<Combobox.Trigger
				class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-muted transition hover:bg-stone-100 hover:text-ink"
				aria-label="Show options"
			>
				<span aria-hidden="true">▾</span>
			</Combobox.Trigger>
		</div>

		{#if value.length > 0}
			<ul class="mt-2 flex flex-wrap gap-1.5" aria-label="Selected items">
				{#each value as itemValue (itemValue)}
					{@const label = labelByValue.get(itemValue) ?? itemValue}
					<li>
						<span
							class="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-stone-50 py-0.5 pr-1 pl-2 text-xs text-ink"
						>
							<span class="truncate">{label}</span>
							<button
								type="button"
								class="shrink-0 rounded p-0.5 text-ink-muted hover:bg-stone-200 hover:text-ink"
								aria-label="Remove {label}"
								onclick={() => removeValue(itemValue)}
							>
								×
							</button>
						</span>
					</li>
				{/each}
			</ul>
		{/if}

		<Combobox.Portal>
			<Combobox.Content
				class="z-50 max-h-60 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 shadow-md"
				sideOffset={4}
			>
				{#each filteredOptions as option (option.value)}
					<Combobox.Item value={option.value} label={option.label} class={itemClass}>
						{#snippet children({ selected })}
							<span class="truncate">{option.label}</span>
							{#if selected}
								<span class="shrink-0 text-accent" aria-hidden="true">✓</span>
							{/if}
						{/snippet}
					</Combobox.Item>
				{:else}
					<p class="px-3 py-2 text-sm text-ink-muted">{emptyMessage}</p>
				{/each}
			</Combobox.Content>
		</Combobox.Portal>
	</Combobox.Root>
</div>
