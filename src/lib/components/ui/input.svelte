<script lang="ts">
	import { defaultFieldClass, defaultFieldMarginClass, plainFieldClass } from './field-styles';
	import { cn } from '../../cn';

	type Variant = 'default' | 'plain' | 'inline';

	type Props = {
		id?: string;
		name?: string;
		type?: string;
		placeholder?: string;
		value?: string;
		required?: boolean;
		variant?: Variant;
		class?: string;
		'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
		'aria-label'?: string;
		oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
		onkeydown?: (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => void;
		onblur?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
		min?: number | string;
		max?: number | string;
		step?: number | string;
	};

	let {
		id,
		name,
		type = 'text',
		placeholder,
		value = $bindable(),
		required = false,
		variant = 'default',
		class: className = '',
		'aria-invalid': ariaInvalid,
		'aria-label': ariaLabel,
		oninput,
		onkeydown,
		onblur,
		min,
		max,
		step
	}: Props = $props();

	const baseClass = $derived(
		variant === 'plain'
			? plainFieldClass
			: variant === 'inline'
				? defaultFieldClass
				: `${defaultFieldMarginClass} ${defaultFieldClass}`
	);
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
	{onblur}
	{min}
	{max}
	{step}
	bind:value
	class={cn(baseClass, className)}
/>
