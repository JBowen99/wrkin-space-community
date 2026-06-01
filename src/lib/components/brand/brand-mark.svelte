<script lang="ts">
	type Variant = 'wrkin' | 'wrkspace' | 'wrkin.space';

	type Props = {
		variant?: Variant;
		/** Single-color mark (e.g. on dark footers); inherits parent text color */
		monochrome?: boolean;
		class?: string;
	};

	let { variant = 'wrkin', monochrome = false, class: className = '' }: Props = $props();

	const suffix = $derived(
		variant === 'wrkin.space' ? 'in.space' : variant === 'wrkspace' ? 'space' : 'in'
	);
</script>

<span class={className}>
	{#if monochrome}
		wrk{suffix}
	{:else}
		<span class="text-accent">wrk</span>{suffix}
	{/if}
</span>
