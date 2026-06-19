<script lang="ts">
	import { tick } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
	import type { ChatSearchMatch } from '$lib/shared/chat-search';
	import { messageHasSearchMatch } from '$lib/shared/chat-search';
	import type { ChatMessageRow } from '$lib/server/modules';
	import ButtonUi from '../../ui/button.svelte';
	import Tooltip from '../../ui/tooltip.svelte';
	import ChatBubble from './chat-bubble.svelte';

	type Props = {
		messages: ChatMessageRow[];
		currentUserId: string;
		searchQuery?: string;
		activeMatch?: ChatSearchMatch | null;
		activeMatchKey?: string | null;
		searchOpen?: boolean;
	};

	let {
		messages,
		currentUserId,
		searchQuery = '',
		activeMatch = null,
		activeMatchKey = null,
		searchOpen = false
	}: Props = $props();

	const searching = $derived(searchQuery.length > 0);

	const SCROLL_THRESHOLD = 48;

	let listEl: HTMLUListElement | undefined = $state();
	let atBottom = $state(true);

	function isAtBottom(el: HTMLElement) {
		return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
	}

	function updateScrollState() {
		if (listEl) {
			atBottom = isAtBottom(listEl);
		}
	}

	function scrollToBottom(smooth = false) {
		if (!listEl) return;
		listEl.scrollTo({ top: listEl.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
		atBottom = true;
	}

	export function scrollToActiveMatch() {
		if (!activeMatchKey || !listEl) return;

		const el = listEl.querySelector<HTMLElement>(
			`[data-chat-match="${CSS.escape(activeMatchKey)}"]`
		);
		if (!el) return;

		const listRect = listEl.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();
		const targetTop =
			elRect.top - listRect.top + listEl.scrollTop - listEl.clientHeight / 2 + elRect.height / 2;

		listEl.scrollTo({
			top: Math.max(0, Math.min(targetTop, listEl.scrollHeight - listEl.clientHeight)),
			behavior: 'smooth'
		});
	}

	$effect(() => {
		void messages;
		if (!listEl || searching) return;
		if (atBottom) {
			tick().then(() => scrollToBottom());
		} else {
			tick().then(updateScrollState);
		}
	});

	$effect(() => {
		if (!searching || !activeMatchKey) return;
		tick()
			.then(() => tick())
			.then(() => scrollToActiveMatch());
	});

	$effect(() => {
		if (!listEl) return;

		const observer = new ResizeObserver(() => updateScrollState());
		observer.observe(listEl);
		return () => observer.disconnect();
	});

	const matchingMessageIds = $derived.by(() => {
		if (!searching) return null;
		const ids = new Set<string>();
		for (const m of messages) {
			if (messageHasSearchMatch(m, searchQuery, currentUserId)) {
				ids.add(m.id);
			}
		}
		return ids;
	});

	function getDateKey(d: Date) {
		return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}

	function formatDayLabel(d: Date) {
		const today = new Date();
		const todayKey = getDateKey(today);
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayKey = getDateKey(yesterday);
		const key = getDateKey(d);

		const dateStr = new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
		}).format(d);

		if (key === todayKey) return `Today, ${dateStr}`;
		if (key === yesterdayKey) return `Yesterday, ${dateStr}`;
		const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(d);
		return `${weekday}, ${dateStr}`;
	}

	type DayEntry = { type: 'day'; date: Date; label: string; key: string };
	type MessageEntry = { type: 'message'; index: number; message: ChatMessageRow };
	type ThreadEntry = DayEntry | MessageEntry;

	const threadEntries = $derived.by(() => {
		const entries: ThreadEntry[] = [];
		let lastDateKey = '';
		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];
			const dk = getDateKey(msg.createdAt);
			if (dk !== lastDateKey) {
				lastDateKey = dk;
				entries.push({ type: 'day', date: msg.createdAt, label: formatDayLabel(msg.createdAt), key: dk });
			}
			entries.push({ type: 'message', index: i, message: msg });
		}
		return entries;
	});
</script>

{#if messages.length === 0}
	<div class="flex flex-1 items-center justify-center p-8 text-center">
		<p class="text-ink-muted text-sm">No messages yet. Say hello to your team.</p>
	</div>
{:else}
	<div class="relative flex min-h-0 flex-1 flex-col">
		<ul
			bind:this={listEl}
			onscroll={updateScrollState}
			class="flex-1 space-y-4 overflow-y-auto p-4"
		>
			{#each threadEntries as entry}
				{#if entry.type === 'day'}
					<li
						class="flex items-center gap-3 pt-2 first:pt-0"
						role="separator"
						aria-label={entry.label}
					>
						<hr class="border-border flex-1" />
						<span class="text-ink-muted shrink-0 text-xs font-medium">{entry.label}</span>
						<hr class="border-border flex-1" />
					</li>
				{:else}
					<ChatBubble
						message={entry.message}
						isOwn={entry.message.authorId === currentUserId}
						{searchQuery}
						{activeMatch}
						{activeMatchKey}
						isDimmed={matchingMessageIds !== null && !matchingMessageIds.has(entry.message.id)}
					/>
				{/if}
			{/each}
		</ul>

		{#if !searching && !atBottom}
			<Tooltip text="Jump to latest messages" side="top">
				{#snippet trigger(props)}
					<ButtonUi
						{...props}
						type="button"
						variant="unstyled"
						class="border-border bg-surface-raised text-ink hover:bg-surface-hover absolute bottom-3 left-1/2 z-10 inline-flex size-9 -translate-x-1/2 items-center justify-center rounded-full border shadow-md transition active:scale-95"
						aria-label="Scroll to latest messages"
						onclick={() => scrollToBottom(true)}
					>
						<HugeiconsIcon
							icon={ArrowDown01Icon}
							size={18}
							color="currentColor"
							strokeWidth={2}
							aria-hidden={true}
						/>
					</ButtonUi>
				{/snippet}
			</Tooltip>
		{/if}
	</div>
{/if}
