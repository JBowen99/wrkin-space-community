<script lang="ts">
	import { Checkbox } from 'bits-ui';

	type Props = {
		id?: string;
		checked?: boolean;
		disabled?: boolean;
		name?: string;
		value?: string;
		class?: string;
		onCheckedChange?: (checked: boolean) => void;
	};

	let {
		id,
		checked = $bindable(false),
		disabled = false,
		name,
		value,
		class: className = '',
		onCheckedChange
	}: Props = $props();
</script>

<Checkbox.Root
	{id}
	{name}
	{value}
	{disabled}
	bind:checked
	onCheckedChange={(v) => onCheckedChange?.(v === true)}
	class="inline-flex size-4 shrink-0 items-center justify-center rounded border border-border bg-surface-raised text-white transition hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none data-[state=checked]:border-accent data-[state=checked]:bg-accent {className}"
>
	{#snippet children({ checked: isChecked })}
		{#if isChecked}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 16 16"
				fill="currentColor"
				class="size-3"
				aria-hidden="true"
			>
				<path
					fill-rule="evenodd"
					d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
					clip-rule="evenodd"
				/>
			</svg>
		{/if}
	{/snippet}
</Checkbox.Root>
