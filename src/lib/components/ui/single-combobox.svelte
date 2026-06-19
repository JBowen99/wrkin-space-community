<script lang="ts">
	import { Combobox } from 'bits-ui';
	import { cn } from '../../cn';

	export type SingleComboboxOption = { value: string; label: string; keywords?: string };

	type Props = {
		id?: string;
		value?: string;
		options: SingleComboboxOption[];
		placeholder?: string;
		disabled?: boolean;
		emptyMessage?: string;
		ariaLabel?: string;
		contentClass?: string;
		class?: string;
	};

	let {
		id,
		value = $bindable(''),
		options,
		placeholder = 'Search templates…',
		disabled = false,
		emptyMessage = 'No results found.',
		ariaLabel = placeholder,
		contentClass = '',
		class: className = ''
	}: Props = $props();

	let searchValue = $state('');

	const filteredOptions = $derived(
		searchValue === ''
			? options
			: options.filter((option) => {
					const haystack = `${option.label} ${option.keywords ?? ''}`.toLowerCase();
					return haystack.includes(searchValue.toLowerCase());
				})
	);

	const inputClass =
		'h-11 w-full rounded-lg border border-border bg-surface-raised py-2 pl-3 pr-12 text-sm text-ink placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none disabled:opacity-50';

	const triggerClass =
		'absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface-hover hover:text-ink';

	const itemClass =
		'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-hover data-[highlighted]:bg-surface-muted data-[state=checked]:bg-accent-muted data-[state=checked]:text-accent';
</script>

<div class={className}>
	<Combobox.Root
		type="single"
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
				aria-label={ariaLabel}
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

		<Combobox.Portal>
			<Combobox.Content
				class={cn('border-border bg-surface-raised z-[100] max-h-60 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] overflow-y-auto rounded-lg border p-1 shadow-md', contentClass)}
				sideOffset={4}
			>
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
					<p class="px-3 py-2 text-sm text-ink-muted">{emptyMessage}</p>
				{/each}
			</Combobox.Content>
		</Combobox.Portal>
	</Combobox.Root>
</div>
