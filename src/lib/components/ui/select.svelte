<script lang="ts">
	import { Select } from 'bits-ui';

	type Option = { value: string; label: string };

	type Props = {
		id?: string;
		name?: string;
		value?: string;
		options: Option[];
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		onValueChange?: (value: string) => void;
	};

	let {
		id,
		name,
		value = $bindable(),
		options,
		placeholder = 'Select…',
		required = false,
		disabled = false,
		class: className = '',
		onValueChange
	}: Props = $props();

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? placeholder);

	const triggerClass =
		'mt-1.5 flex h-11 min-h-11 w-full box-border items-center justify-between gap-2 rounded-lg border border-border bg-surface-raised px-3 text-left text-sm leading-normal text-ink transition hover:border-accent/40 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none disabled:opacity-50';
</script>

<Select.Root
	type="single"
	{name}
	{required}
	{disabled}
	bind:value
	onValueChange={(v) => {
		if (typeof v === 'string') {
			value = v;
			onValueChange?.(v);
		}
	}}
	items={options.map((o) => ({ value: o.value, label: o.label }))}
>
	<Select.Trigger aria-label={placeholder}>
		{#snippet child({ props })}
			<button {...props} {id} class="{triggerClass} {props.class ?? ''} {className}">
				<span class:text-stone-400={!value}>{selectedLabel}</span>
				<span aria-hidden="true" class="text-ink-muted">▾</span>
			</button>
		{/snippet}
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			class="z-50 min-w-[var(--bits-select-anchor-width)] rounded-lg border border-border bg-surface-raised p-1 shadow-md"
			sideOffset={4}
		>
			{#each options as option (option.value)}
				<Select.Item
					value={option.value}
					label={option.label}
					class="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-ink hover:bg-stone-50 data-[highlighted]:bg-stone-100 data-[state=checked]:bg-accent-muted data-[state=checked]:text-accent"
				>
					{option.label}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Portal>
</Select.Root>
