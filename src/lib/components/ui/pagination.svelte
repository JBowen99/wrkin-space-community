<script lang="ts">
	import { Pagination } from 'bits-ui';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

	type Props = {
		count: number;
		perPage: number;
		page: number;
		onPageChange: (page: number) => void;
		class?: string;
	};

	let { count, perPage, page, onPageChange, class: className = '' }: Props = $props();

	const showPagination = $derived(count > perPage);

	const navBtnClass =
		'inline-flex size-9 items-center justify-center rounded-lg text-ink transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent active:scale-[0.98]';
	const pageBtnClass =
		'inline-flex size-9 select-none items-center justify-center rounded-lg bg-transparent text-sm font-medium text-ink transition hover:bg-stone-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 data-selected:bg-accent data-selected:text-white data-selected:hover:bg-accent-hover';
</script>

{#if showPagination}
	<Pagination.Root {count} {perPage} {page} {onPageChange} class={className}>
		{#snippet children({ pages, range })}
			<nav class="flex flex-col items-center gap-2" aria-label="Pagination">
				<div class="flex items-center gap-1">
					<Pagination.PrevButton class={navBtnClass} aria-label="Previous page">
						<HugeiconsIcon
							icon={ArrowLeft01Icon}
							size={18}
							color="currentColor"
							strokeWidth={2}
							aria-hidden={true}
						/>
					</Pagination.PrevButton>

					<div class="flex items-center gap-0.5 px-1">
						{#each pages as pageItem (pageItem.key)}
							{#if pageItem.type === 'ellipsis'}
								<span class="px-1 text-sm text-ink-muted select-none" aria-hidden="true">…</span>
							{:else}
								<Pagination.Page page={pageItem} class={pageBtnClass}>
									{pageItem.value}
								</Pagination.Page>
							{/if}
						{/each}
					</div>

					<Pagination.NextButton class={navBtnClass} aria-label="Next page">
						<HugeiconsIcon
							icon={ArrowRight01Icon}
							size={18}
							color="currentColor"
							strokeWidth={2}
							aria-hidden={true}
						/>
					</Pagination.NextButton>
				</div>

				<p class="text-xs text-ink-muted">
					Showing {range.start}–{range.end} of {count}
				</p>
			</nav>
		{/snippet}
	</Pagination.Root>
{/if}
