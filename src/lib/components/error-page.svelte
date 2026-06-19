<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';

	let {
		status,
		error,
		homeHref = '/teams'
	}: {
		status: number;
		error: App.Error | null;
		homeHref?: string;
	} = $props();

	const title = $derived(
		status === 404 ? 'Page not found' : status >= 500 ? 'Something went wrong' : 'Error'
	);
	const message = $derived(error?.message ?? 'An unexpected error occurred.');
	const errorId = $derived(error?.errorId);
</script>

<div class="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
	<p class="font-display text-ink-muted/30 text-6xl font-semibold" aria-hidden="true">{status}</p>
	<h1 class="font-display text-ink mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
	<p class="text-ink-muted mt-2 max-w-md text-sm leading-relaxed">{message}</p>
	{#if errorId}
		<p class="text-ink-muted mt-4 font-mono text-xs">Error ID: {errorId}</p>
	{/if}
	<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
		<Button href={homeHref}>Go to teams</Button>
		<Button variant="secondary" onclick={() => location.reload()}>Try again</Button>
	</div>
</div>
