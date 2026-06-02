<script lang="ts">
	type Props = {
		id?: string;
		name?: string;
		placeholder?: string;
		value?: string;
		required?: boolean;
		rows?: number;
		class?: string;
	};

	let {
		id,
		name,
		placeholder,
		value = $bindable(''),
		required = false,
		rows = 3,
		class: className = ''
	}: Props = $props();
</script>

<textarea
	{id}
	{name}
	{placeholder}
	{required}
	{rows}
	bind:value
	class="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none {className}"
></textarea>
