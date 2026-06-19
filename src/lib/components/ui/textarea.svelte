<script lang="ts">
	import {
		defaultFieldClass,
		defaultFieldMarginClass,
		plainTextareaClass
	} from './field-styles';
	import { cn } from '../../cn';

	type Variant = 'default' | 'plain';

	type Props = {
		id?: string;
		name?: string;
		placeholder?: string;
		value?: string;
		required?: boolean;
		rows?: number;
		variant?: Variant;
		class?: string;
		onpaste?: (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
		oninput?: (event: Event & { currentTarget: HTMLTextAreaElement }) => void;
		onkeydown?: (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
	};

	let {
		id,
		name,
		placeholder,
		value = $bindable(''),
		required = false,
		rows = 3,
		variant = 'default',
		class: className = '',
		onpaste,
		oninput,
		onkeydown
	}: Props = $props();

	let ref: HTMLTextAreaElement | undefined = $state();

	export function getRef() {
		return ref;
	}

	const baseClass = $derived(
		variant === 'plain' ? plainTextareaClass : `${defaultFieldMarginClass} ${defaultFieldClass}`
	);
</script>

<textarea
	{id}
	{name}
	{placeholder}
	{required}
	{rows}
	{onpaste}
	{oninput}
	{onkeydown}
	bind:value
	bind:this={ref}
	class={cn(baseClass, className)}
></textarea>
