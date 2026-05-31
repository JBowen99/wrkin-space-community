<script lang="ts">
	type Props = {
		variant: 'chat' | 'cards' | 'calendar' | 'docs' | 'forum' | 'tasks';
	};

	let { variant }: Props = $props();
</script>

<div class="flex h-full w-full overflow-hidden" aria-hidden="true">
	{#if variant === 'chat'}
		<div class="flex w-full flex-col justify-start gap-1.5">
			<div class="flex justify-start">
				<div
					class="skeleton-hatch h-6 w-[50%] rounded-xl rounded-bl-sm border border-dashed border-border/60"
				></div>
			</div>
			<div class="flex justify-end">
				<div
					class="skeleton-hatch skeleton-hatch-accent h-6 w-[42%] rounded-xl rounded-br-sm border border-dashed border-accent/40"
				></div>
			</div>
			<div class="flex justify-start">
				<div
					class="skeleton-hatch h-6 w-[58%] rounded-xl rounded-bl-sm border border-dashed border-border/60"
				></div>
			</div>
		</div>
	{:else if variant === 'cards'}
		<div class="flex h-full w-full items-center justify-center gap-2">
			{#each [1, 2, 3] as _ (_)}
				<div
					class="skeleton-hatch flex h-[80%] max-w-[5.5rem] min-w-0 flex-1 flex-col rounded-xl border border-dashed border-border/60 p-1.5"
				>
					<div
						class="skeleton-hatch mx-auto h-2.5 w-3/4 rounded border border-dashed border-border/50"
					></div>
					<div class="mt-1.5 flex flex-1 flex-col gap-1.5">
						<div
							class="skeleton-hatch rounded-lg border border-dashed border-border/50 px-2 py-2.5"
						></div>
						<div
							class="skeleton-hatch rounded-lg border border-dashed border-border/50 px-2 py-2.5"
						></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if variant === 'docs'}
		<div class="grid h-full w-full grid-cols-3 grid-rows-2 gap-1.5">
			{#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
				<div
					class="skeleton-hatch flex min-h-0 flex-col rounded border border-dashed border-border/60 p-1"
				>
					<div class="h-2 w-2/3 rounded-sm bg-stone-200/50"></div>
				</div>
			{/each}
		</div>
	{:else if variant === 'forum'}
		<ul class="flex w-full flex-col gap-1.5">
			{#each [1, 2, 3] as _ (_)}
				<li class="skeleton-hatch h-4 w-full rounded border border-dashed border-border/60"></li>
			{/each}
		</ul>
	{:else if variant === 'tasks'}
		<ul class="flex w-full flex-col gap-1.5">
			{#each [1, 2, 3] as _ (_)}
				<li
					class="flex items-start gap-2 rounded-lg border border-dashed border-border/60 px-2 py-1.5"
				>
					<div
						class="skeleton-hatch mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-dashed border-border/50"
					></div>
					<div class="flex flex-1 flex-col gap-1 py-px">
						<div
							class="skeleton-hatch h-2.5 w-full rounded border border-dashed border-border/50"
						></div>
						<div
							class="skeleton-hatch h-2 w-2/3 rounded border border-dashed border-border/40"
						></div>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="flex w-full flex-col justify-start gap-1.5">
			{#each [1, 2, 3] as _ (_)}
				<div
					class="flex items-stretch gap-2 rounded-lg border border-dashed border-border/60 px-1.5 py-1.5"
				>
					<div
						class="skeleton-hatch flex h-9 w-10 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-border/50"
					>
						<div class="skeleton-hatch h-2 w-5 rounded border border-dashed border-border/40"></div>
					</div>
					<div class="flex flex-1 flex-col justify-center gap-1 py-0.5">
						<div
							class="skeleton-hatch h-2.5 w-full rounded border border-dashed border-border/50"
						></div>
						<div
							class="skeleton-hatch h-2 w-2/3 rounded border border-dashed border-border/40"
						></div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.skeleton-hatch {
		background-color: color-mix(in srgb, var(--color-surface) 88%, var(--color-border));
		background-image: repeating-linear-gradient(
			-42deg,
			transparent 0,
			transparent 5px,
			color-mix(in srgb, var(--color-border) 28%, transparent) 5px,
			color-mix(in srgb, var(--color-border) 28%, transparent) 6px
		);
	}

	.skeleton-hatch-accent {
		background-color: color-mix(in srgb, var(--color-accent-muted) 70%, transparent);
		background-image: repeating-linear-gradient(
			-42deg,
			transparent 0,
			transparent 5px,
			color-mix(in srgb, var(--color-accent) 18%, transparent) 5px,
			color-mix(in srgb, var(--color-accent) 18%, transparent) 6px
		);
	}
</style>
