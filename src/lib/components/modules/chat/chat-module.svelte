<script lang="ts">
	import { tick } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowDown01Icon,
		ArrowUp01Icon,
		Cancel01Icon,
		Search01Icon
	} from '@hugeicons/core-free-icons';
	import type { ChatMessageRow } from '$lib/server/modules';
	import { findChatMatches, matchKey } from '$lib/shared/chat-search';
	import Input from '../../ui/input.svelte';
	import ChatThread from './chat-thread.svelte';
	import ChatComposer from './chat-composer.svelte';

	type Props = {
		messages: ChatMessageRow[];
		currentUserId: string;
	};

	let { messages, currentUserId }: Props = $props();

	let searchOpen = $state(false);
	let searchQuery = $state('');
	let activeMatchIndex = $state(-1);
	let threadRef: ChatThread | undefined = $state();

	const matches = $derived(findChatMatches(messages, searchQuery, currentUserId));

	const searchResetKey = $derived(`${searchQuery.trim()}\0${messages.length}`);
	let lastSearchResetKey = '';
	const activeMatch = $derived(
		activeMatchIndex >= 0 && activeMatchIndex < matches.length ? matches[activeMatchIndex] : null
	);
	const activeMatchKey = $derived(activeMatch ? matchKey(activeMatch) : null);

	const resultLabel = $derived.by(() => {
		const q = searchQuery.trim();
		if (!q) return '';
		if (matches.length === 0) return 'No results';
		return `${activeMatchIndex + 1} of ${matches.length}`;
	});

	const canGoNewer = $derived(activeMatchIndex >= 0 && activeMatchIndex < matches.length - 1);
	const canGoOlder = $derived(activeMatchIndex > 0);

	$effect(() => {
		if (searchResetKey === lastSearchResetKey) return;
		lastSearchResetKey = searchResetKey;
		activeMatchIndex = matches.length > 0 ? matches.length - 1 : -1;
	});

	async function scrollToMatch() {
		await tick();
		await tick();
		threadRef?.scrollToActiveMatch();
	}

	$effect(() => {
		if (searchOpen) {
			tick().then(() => document.getElementById('chat-search')?.focus());
		}
	});

	function openSearch() {
		searchOpen = true;
	}

	function closeSearch() {
		searchOpen = false;
		searchQuery = '';
		activeMatchIndex = -1;
	}

	async function goNewer() {
		if (!canGoNewer) return;
		activeMatchIndex += 1;
		await scrollToMatch();
	}

	async function goOlder() {
		if (!canGoOlder) return;
		activeMatchIndex -= 1;
		await scrollToMatch();
	}

	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			closeSearch();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (e.shiftKey) {
				goNewer();
			} else {
				goOlder();
			}
		}
	}
</script>

<div
	class="relative mt-6 flex max-h-[calc(100vh-12rem)] min-h-[24rem] flex-col overflow-hidden rounded-xl border border-border bg-surface"
>
	{#if searchOpen}
		<div
			class="flex shrink-0 items-center gap-2 border-b border-border bg-surface-raised px-3 py-2"
			role="search"
		>
			<button
				type="button"
				class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-stone-100 hover:text-ink"
				aria-label="Close search"
				onclick={closeSearch}
			>
				<HugeiconsIcon
					icon={Cancel01Icon}
					size={20}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</button>
			<div class="min-w-0 flex-1">
				<Input
					id="chat-search"
					type="search"
					placeholder="Search messages…"
					aria-label="Search messages"
					bind:value={searchQuery}
					onkeydown={onSearchKeydown}
					class="mt-0 box-border h-9 min-h-9 py-0 leading-normal"
				/>
			</div>
			<span
				class="w-16 shrink-0 text-center text-xs text-ink-muted tabular-nums"
				aria-live="polite"
			>
				{resultLabel}
			</span>
			<div class="flex shrink-0 items-center gap-0.5">
				<button
					type="button"
					class="inline-flex size-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-stone-100 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
					aria-label="Older match"
					disabled={!canGoOlder}
					onclick={goOlder}
				>
					<HugeiconsIcon
						icon={ArrowUp01Icon}
						size={18}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</button>
				<button
					type="button"
					class="inline-flex size-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-stone-100 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
					aria-label="Newer match"
					disabled={!canGoNewer}
					onclick={goNewer}
				>
					<HugeiconsIcon
						icon={ArrowDown01Icon}
						size={18}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</button>
			</div>
		</div>
	{:else}
		<button
			type="button"
			class="absolute top-2 right-2 z-20 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-ink-muted shadow-sm transition hover:bg-stone-50 hover:text-ink"
			aria-label="Search messages"
			onclick={openSearch}
		>
			<HugeiconsIcon
				icon={Search01Icon}
				size={18}
				color="currentColor"
				strokeWidth={2}
				aria-hidden={true}
			/>
		</button>
	{/if}

	<ChatThread
		bind:this={threadRef}
		{messages}
		{currentUserId}
		{searchOpen}
		searchQuery={searchQuery.trim()}
		{activeMatch}
		{activeMatchKey}
	/>
	<ChatComposer />
</div>
