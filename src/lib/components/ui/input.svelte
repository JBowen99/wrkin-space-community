<script lang="ts">
	type Props = {
		id?: string;
		name?: string;
		type?: string;
		placeholder?: string;
		value?: string;
		required?: boolean;
		class?: string;
		'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
		'aria-label'?: string;
		oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
		onkeydown?: (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => void;
	};

	let {
		id,
		name,
		type = 'text',
		placeholder,
		value = $bindable(),
		required = false,
		class: className = '',
		'aria-invalid': ariaInvalid,
		'aria-label': ariaLabel,
		oninput,
		onkeydown
	}: Props = $props();
</script>

<input
	{id}
	{name}
	{type}
	{placeholder}
	{required}
	aria-invalid={ariaInvalid}
	aria-label={ariaLabel}
	{oninput}
	{onkeydown}
	bind:value
	class="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none {className}"
/>
