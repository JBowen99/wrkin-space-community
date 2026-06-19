<script lang="ts">
	type Props = {
		variant: 'chat' | 'cards' | 'calendar' | 'docs' | 'forum' | 'tasks' | 'okrs' | 'decisions';
	};

	let { variant }: Props = $props();
</script>

<div class="flex h-full w-full overflow-hidden" aria-hidden="true">
	{#if variant === 'chat'}
		<div class="flex w-full flex-col justify-start gap-1.5">
			<div class="flex justify-start">
				<div
					class="skeleton-hatch border-border/60 h-6 w-[50%] rounded-xl rounded-bl-sm border border-dashed"
				></div>
			</div>
			<div class="flex justify-end">
				<div
					class="skeleton-hatch skeleton-hatch-accent border-accent/40 h-6 w-[42%] rounded-xl rounded-br-sm border border-dashed"
				></div>
			</div>
			<div class="flex justify-start">
				<div
					class="skeleton-hatch border-border/60 h-6 w-[58%] rounded-xl rounded-bl-sm border border-dashed"
				></div>
			</div>
		</div>
	{:else if variant === 'cards'}
		<div class="flex h-full w-full min-w-0 items-center justify-center gap-1">
			{#each [1, 2, 3] as _ (_)}
				<div
					class="skeleton-hatch border-border/60 flex h-[80%] min-w-0 flex-1 flex-col rounded-lg border border-dashed p-1"
				>
					<div
						class="skeleton-hatch border-border/50 mx-auto h-2.5 w-3/4 rounded border border-dashed"
					></div>
					<div class="mt-1.5 flex flex-1 flex-col gap-1.5">
						<div
							class="skeleton-hatch border-border/50 rounded-lg border border-dashed px-2 py-2.5"
						></div>
						<div
							class="skeleton-hatch border-border/50 rounded-lg border border-dashed px-2 py-2.5"
						></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if variant === 'docs'}
		<div class="grid h-full w-full grid-cols-3 grid-rows-2 gap-1.5">
			{#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
				<div
					class="skeleton-hatch border-border/60 flex min-h-0 flex-col rounded border border-dashed p-1"
				>
					<div class="bg-surface-inset/50 h-2 w-2/3 rounded-sm"></div>
				</div>
			{/each}
		</div>
	{:else if variant === 'forum'}
		<ul class="flex w-full flex-col gap-1.5">
			{#each [1, 2, 3] as _ (_)}
				<li class="skeleton-hatch border-border/60 h-4 w-full rounded border border-dashed"></li>
			{/each}
		</ul>
	{:else if variant === 'tasks'}
		<ul class="flex w-full flex-col gap-1.5">
			{#each [1, 2, 3] as _ (_)}
				<li
					class="border-border/60 flex items-start gap-2 rounded-lg border border-dashed px-2 py-1.5"
				>
					<div
						class="skeleton-hatch border-border/50 mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-dashed"
					></div>
					<div class="flex flex-1 flex-col gap-1 py-px">
						<div
							class="skeleton-hatch border-border/50 h-2.5 w-full rounded border border-dashed"
						></div>
						<div
							class="skeleton-hatch border-border/40 h-2 w-2/3 rounded border border-dashed"
						></div>
					</div>
				</li>
			{/each}
		</ul>
	{:else if variant === 'okrs'}
		<div class="flex w-full flex-col gap-2">
			<div class="skeleton-hatch border-border/60 h-6 w-28 rounded-full border border-dashed"></div>
			<div class="skeleton-hatch border-border/50 h-2.5 w-3/4 rounded border border-dashed"></div>
			<div
				class="skeleton-hatch border-border/50 h-2 w-full rounded-full border border-dashed"
			></div>
			{#each [1, 2] as _ (_)}
				<div class="border-border/50 mt-0.5 rounded-lg border border-dashed px-2.5 py-2">
					<div class="skeleton-hatch border-border/40 h-2 w-2/3 rounded border border-dashed"></div>
					<div
						class="skeleton-hatch border-border/40 mt-1.5 h-1.5 w-full rounded-full border border-dashed"
					></div>
				</div>
			{/each}
		</div>
	{:else if variant === 'decisions'}
		<div class="flex w-full flex-col gap-2">
			<div class="flex gap-1.5">
				<div
					class="skeleton-hatch border-border/60 h-6 w-[4.5rem] rounded-full border border-dashed"
				></div>
				<div
					class="skeleton-hatch border-border/60 h-6 w-24 rounded-full border border-dashed"
				></div>
			</div>
			<ul class="flex flex-col gap-2">
				{#each [1, 2, 3] as _ (_)}
					<li
						class="skeleton-hatch border-border/60 h-11 rounded-lg border border-dashed px-2.5 py-2"
					></li>
				{/each}
			</ul>
		</div>
	{:else}
		<div class="flex w-full flex-col justify-start gap-1.5">
			{#each [1, 2, 3] as _ (_)}
				<div
					class="border-border/60 flex items-stretch gap-2 rounded-lg border border-dashed px-1.5 py-1.5"
				>
					<div
						class="skeleton-hatch border-border/50 flex h-9 w-10 shrink-0 flex-col items-center justify-center rounded-md border border-dashed"
					>
						<div class="skeleton-hatch border-border/40 h-2 w-5 rounded border border-dashed"></div>
					</div>
					<div class="flex flex-1 flex-col justify-center gap-1 py-0.5">
						<div
							class="skeleton-hatch border-border/50 h-2.5 w-full rounded border border-dashed"
						></div>
						<div
							class="skeleton-hatch border-border/40 h-2 w-2/3 rounded border border-dashed"
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
