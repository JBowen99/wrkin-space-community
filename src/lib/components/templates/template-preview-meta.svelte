<script lang="ts">
	import Badge from '../ui/badge.svelte';

	type Props = {
		includesSampleContent?: boolean;
		moduleLabels?: string[];
		detailLines?: string[];
	};

	let { includesSampleContent, moduleLabels = [], detailLines = [] }: Props = $props();
</script>

<div class="mt-2 space-y-2">
	{#if includesSampleContent !== undefined}
		<Badge variant={includesSampleContent ? 'accent' : 'neutral'}>
			{includesSampleContent ? 'Includes sample content' : 'Structure only'}
		</Badge>
	{/if}

	{#if moduleLabels.length > 0}
		<p class="text-ink-muted text-xs">
			<span class="text-ink font-medium">Modules:</span>
			{moduleLabels.join(' · ')}
		</p>
	{/if}

	{#if detailLines.length > 0}
		<p class="text-ink-muted text-xs">
			<span class="text-ink font-medium">Columns:</span>
			{detailLines.join(' · ')}
		</p>
	{/if}
</div>
