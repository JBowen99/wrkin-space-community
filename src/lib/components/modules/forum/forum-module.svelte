<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { ForumThreadSort, ForumThreadsPage } from '$lib/server/forum';
	import Input from '../../ui/input.svelte';
	import Select from '../../ui/select.svelte';
	import Pagination from '../../ui/pagination.svelte';
	import ForumThreadRow from './forum-thread-row.svelte';
	import ForumNewThreadForm from './forum-new-thread-form.svelte';

	type Props = {
		threadsPage: ForumThreadsPage;
		threadHref: (threadId: string) => string;
	};

	let { threadsPage, threadHref }: Props = $props();

	const { threads, totalCount, page: currentPage, perPage, q, sort } = $derived(threadsPage);

	const sortOptions = [
		{ value: 'active', label: 'Recently active' },
		{ value: 'newest', label: 'Newest' },
		{ value: 'oldest', label: 'Oldest' },
		{ value: 'replies', label: 'Most replies' },
		{ value: 'title', label: 'Title (A–Z)' }
	] as const;

	let searchInput = $state('');
	let searchDebounce: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		searchInput = q;
	});

	function navigateList(updates: { q?: string; sort?: ForumThreadSort; page?: number }) {
		const url = new URL(page.url);

		const nextQ = updates.q !== undefined ? updates.q.trim() : q;
		if (nextQ) {
			url.searchParams.set('q', nextQ);
		} else {
			url.searchParams.delete('q');
		}

		const nextSort = updates.sort ?? sort;
		if (nextSort === 'active') {
			url.searchParams.delete('sort');
		} else {
			url.searchParams.set('sort', nextSort);
		}

		const nextPage = updates.page ?? 1;
		if (nextPage <= 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(nextPage));
		}

		const search = url.searchParams.toString();
		goto(`${url.pathname}${search ? `?${search}` : ''}`, { keepFocus: true, invalidateAll: true });
	}

	function onSearchInput() {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			if (searchInput.trim() === q.trim()) return;
			navigateList({ q: searchInput, page: 1 });
		}, 300);
	}

	function onSortChange(value: string) {
		navigateList({ sort: value as ForumThreadSort, page: 1 });
	}

	function goToPage(nextPage: number) {
		navigateList({ page: nextPage });
	}
</script>

<div class="mt-6 flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3 border-b border-border pb-4">
		<div class="min-w-[10rem] flex-1">
			<Input
				id="forum-search"
				type="search"
				placeholder="Search threads…"
				aria-label="Search threads"
				bind:value={searchInput}
				oninput={onSearchInput}
				class="mt-0 box-border h-10 min-h-10 py-0 leading-normal"
			/>
		</div>
		<div class="w-full min-w-[10rem] sm:w-44">
			<Select
				options={[...sortOptions]}
				value={sort}
				placeholder="Sort by"
				class="mt-0"
				onValueChange={onSortChange}
			/>
		</div>
		<ForumNewThreadForm />
	</div>

	{#if totalCount === 0 && !q}
		<p class="border-b border-dashed border-border py-10 text-center text-sm text-ink-muted">
			No threads yet. Start the first discussion above.
		</p>
	{:else if threads.length === 0}
		<p class="border-b border-dashed border-border py-10 text-center text-sm text-ink-muted">
			No threads match your search.
		</p>
	{:else}
		<ul class="divide-y divide-border rounded-lg border border-border">
			{#each threads as thread (thread.id)}
				<li class="px-4 first:rounded-t-lg last:rounded-b-lg">
					<ForumThreadRow {thread} href={threadHref(thread.id)} />
				</li>
			{/each}
		</ul>

		<Pagination
			count={totalCount}
			{perPage}
			page={currentPage}
			onPageChange={goToPage}
			class="mt-2"
		/>
	{/if}
</div>
