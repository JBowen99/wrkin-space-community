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
	import ButtonUi from '../../ui/button.svelte';
	import IconButton from '../../ui/icon-button.svelte';
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
	class="border-border bg-surface relative flex min-h-[24rem] flex-1 flex-col overflow-hidden rounded-xl border"
>
	<div class="absolute top-2 left-2 z-20" role="search">
		<div
			class="border-border bg-surface-raised flex items-center gap-1.5 overflow-hidden rounded-lg border p-1 shadow-sm transition-all duration-200 ease-out {searchOpen
				? 'w-[360px]'
				: 'w-9'}"
		>
			<IconButton
				label={searchOpen ? 'Close search' : 'Search messages'}
				size="md"
				variant="subtle"
				onclick={searchOpen ? closeSearch : openSearch}
			>
				<HugeiconsIcon
					icon={searchOpen ? Cancel01Icon : Search01Icon}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</IconButton>
			<div
				class="min-w-0 flex-1 overflow-hidden transition-opacity duration-200 {searchOpen
					? 'opacity-100'
					: 'pointer-events-none opacity-0'}"
			>
				<Input
					id="chat-search"
					type="search"
					placeholder="Search…"
					aria-label="Search messages"
					bind:value={searchQuery}
					onkeydown={onSearchKeydown}
					class="mt-0 box-border h-7 min-h-7 py-0 text-xs leading-normal"
				/>
			</div>
			<span
				class="text-ink-muted w-14 shrink-0 text-center text-[0.65rem] tabular-nums transition-opacity duration-200 {searchOpen
					? 'opacity-100'
					: 'pointer-events-none opacity-0'}"
				aria-live="polite"
			>
				{resultLabel}
			</span>
			<div
				class="flex shrink-0 items-center gap-px transition-opacity duration-200 {searchOpen
					? 'opacity-100'
					: 'pointer-events-none opacity-0'}"
			>
				<ButtonUi
					type="button"
					variant="unstyled"
					class="text-ink-muted hover:bg-surface-hover hover:text-ink inline-flex size-7 items-center justify-center rounded-md transition disabled:pointer-events-none disabled:opacity-40"
					aria-label="Older match"
					disabled={!canGoOlder}
					onclick={goOlder}
				>
					<HugeiconsIcon
						icon={ArrowUp01Icon}
						size={14}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</ButtonUi>
				<ButtonUi
					type="button"
					variant="unstyled"
					class="text-ink-muted hover:bg-surface-hover hover:text-ink inline-flex size-7 items-center justify-center rounded-md transition disabled:pointer-events-none disabled:opacity-40"
					aria-label="Newer match"
					disabled={!canGoNewer}
					onclick={goNewer}
				>
					<HugeiconsIcon
						icon={ArrowDown01Icon}
						size={14}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</ButtonUi>
			</div>
		</div>
	</div>

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
