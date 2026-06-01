<script lang="ts">
	import { enhance } from '$app/forms';
	import DialogUi from '$lib/components/ui/dialog.svelte';
	import ScrollArea from '$lib/components/ui/scroll-area.svelte';
	import { MODULE_CATALOG } from '$lib/shared/modules';
	import type { SubscriptionTier } from '$lib/shared/pricing';

	type Props = {
		open?: boolean;
		tier?: SubscriptionTier;
	};

	let { open = $bindable(false), tier: _tier = 'personal' }: Props = $props();
</script>

<DialogUi bind:open title="Add a module" description="Choose a tool to add to this wrkspace.">
	<ScrollArea class="max-h-[min(18rem,calc(85vh-11rem))]">
		<ul class="space-y-1 pr-3">
			{#each MODULE_CATALOG as entry (entry.type)}
				<li>
					{#if entry.enabled}
						<form
							method="POST"
							action="?/addModule"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										open = false;
									}
									await update();
								};
							}}
						>
							<input type="hidden" name="type" value={entry.type} />
							<button
								type="submit"
								class="w-full rounded-lg px-3 py-3 text-left transition hover:bg-stone-50 dark:hover:bg-stone-800/60"
							>
								<span class="font-medium text-ink">{entry.label}</span>
								<span class="mt-0.5 block text-sm text-ink-muted">{entry.description}</span>
							</button>
						</form>
					{:else}
						<div class="cursor-not-allowed rounded-lg px-3 py-3 opacity-50" aria-disabled="true">
							<div class="flex items-start justify-between gap-2">
								<span class="font-medium text-ink">{entry.label}</span>
								<span class="shrink-0 text-xs text-ink-muted">Coming soon</span>
							</div>
							<span class="mt-0.5 block text-sm text-ink-muted">{entry.description}</span>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</ScrollArea>
</DialogUi>
