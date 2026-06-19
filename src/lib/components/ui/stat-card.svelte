<script lang="ts">
	import Card from './card.svelte';

	type Props = {
		label: string;
		value: string | number;
		valueClass?: string;
		class?: string;
	};

	let { label, value, valueClass = '', class: className = '' }: Props = $props();
</script>

<Card padding="compact" class={className}>
	<p class="text-ink-muted text-sm font-medium">{label}</p>
	<p class="font-display text-ink mt-1 text-3xl font-semibold {valueClass}">{value}</p>
</Card>
