<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';
	import { fieldShellClass, fieldShellMarginClass } from './field-styles';

	type Props = {
		class?: string;
		withMargin?: boolean;
		children: Snippet;
	};

	let { class: className = '', withMargin = true, children }: Props = $props();

	const shellClass = $derived(
		cn(withMargin && fieldShellMarginClass, fieldShellClass, className)
	);
</script>

<div class={shellClass}>
	{@render children()}
</div>
