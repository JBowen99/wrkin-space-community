<script lang="ts">
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Add01Icon } from '@hugeicons/core-free-icons';
	import Input from '../../ui/input.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Tooltip from '../../ui/tooltip.svelte';

	let adding = $state(false);
	let title = $state('');
</script>

<div class="flex h-full min-h-0 w-72 shrink-0 flex-col">
	{#if adding}
		<form
			method="POST"
			action="?/addColumn"
			class="bg-surface-muted/60 flex h-full min-h-0 flex-col gap-2 rounded-xl border border-dashed border-stone-300 p-3"
			use:enhance={() => {
				return async ({ update }) => {
					adding = false;
					title = '';
					await update();
				};
			}}
		>
			<Input name="title" bind:value={title} placeholder="Column name" required />
			<div class="flex gap-2">
				<ButtonUi type="submit" variant="primary" class="flex-1">Add</ButtonUi>
				<ButtonUi type="button" variant="ghost" onclick={() => (adding = false)}>Cancel</ButtonUi>
			</div>
		</form>
	{:else}
		<Tooltip text="Add a new column to the board">
			{#snippet trigger(props)}
				<ButtonUi
					{...props}
					type="button"
					variant="unstyled"
					class="bg-surface-muted/40 text-ink-muted hover:border-accent/40 hover:bg-surface-hover/80 hover:text-ink flex h-full min-h-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 text-sm font-medium transition"
					onclick={() => (adding = true)}
				>
					<HugeiconsIcon
						icon={Add01Icon}
						size={16}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
					Add column
				</ButtonUi>
			{/snippet}
		</Tooltip>
	{/if}
</div>
