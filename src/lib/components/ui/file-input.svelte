<script lang="ts">
	type Props = {
		accept?: string;
		multiple?: boolean;
		disabled?: boolean;
		name?: string;
		class?: string;
		/** Bind to the underlying `<input type="file">` for `.click()` and form integration. */
		input?: HTMLInputElement | null;
		onchange?: (event: Event & { currentTarget: HTMLInputElement }) => void;
	};

	let {
		accept,
		multiple = false,
		disabled = false,
		name,
		class: className = 'sr-only',
		input = $bindable<HTMLInputElement | null>(null),
		onchange
	}: Props = $props();

	export function pick() {
		input?.click();
	}
</script>

<input
	bind:this={input}
	type="file"
	{accept}
	{multiple}
	{disabled}
	{name}
	class={className}
	{onchange}
/>
