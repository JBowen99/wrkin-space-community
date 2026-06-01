<script lang="ts">
	import { Popover } from 'bits-ui';
	import { invalidateAll } from '$app/navigation';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Notification01Icon } from '@hugeicons/core-free-icons';
	import Avatar from '../ui/avatar.svelte';
	import ButtonUi from '../ui/button.svelte';
	import { initialsFromName } from '$lib/shared/initials';
	import {
		formatNotificationSummary,
		formatRelativeTime,
		type ActivityEventDisplay
	} from '$lib/shared/activity-render';
	import type { ActivityMetadata, ActivityType } from '$lib/shared/activity';

	export type SerializedNotificationEvent = {
		id: string;
		type: ActivityType;
		actorUserId: string;
		actorName: string;
		actorImage: string | null;
		targetType: string;
		targetId: string;
		metadata: ActivityMetadata;
		moduleId: string | null;
		moduleType: string | null;
		createdAt: string;
	};

	export type SerializedNotification = {
		id: string;
		readAt: string | null;
		createdAt: string;
		wrkspaceId: string;
		teamSlug: string;
		wrkspaceSlug: string;
		wrkspaceName: string;
		event: SerializedNotificationEvent;
	};

	type Props = {
		notifications: SerializedNotification[];
		unreadCount: number;
		wrkspaceUnreadCount: number;
		activeWrkspaceId: string | null;
	};

	let {
		notifications,
		unreadCount,
		wrkspaceUnreadCount,
		activeWrkspaceId
	}: Props = $props();

	let open = $state(false);
	let tab = $state<'wrkspace' | 'all'>('all');
	let markingAll = $state(false);

	const displayNotifications = $derived(
		tab === 'wrkspace' && activeWrkspaceId
			? notifications.filter((n) => n.wrkspaceId === activeWrkspaceId)
			: notifications
	);

	const badgeCount = $derived(
		tab === 'wrkspace' && activeWrkspaceId ? wrkspaceUnreadCount : unreadCount
	);

	const showWrkspaceTab = $derived(activeWrkspaceId != null);

	function eventForDisplay(n: SerializedNotification): ActivityEventDisplay {
		return {
			...n.event,
			createdAt: new Date(n.event.createdAt)
		};
	}

	async function markRead(notificationId: string) {
		await fetch('/api/notifications', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'markRead', notificationId })
		});
		await invalidateAll();
	}

	async function markAllRead() {
		markingAll = true;
		try {
			await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'markAllRead',
					wrkspaceId: tab === 'wrkspace' ? activeWrkspaceId : null
				})
			});
			await invalidateAll();
		} finally {
			markingAll = false;
		}
	}

	async function handleNotificationClick(n: SerializedNotification) {
		if (!n.readAt) {
			await markRead(n.id);
		}
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class="relative inline-flex size-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-stone-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none"
		aria-label="Notifications"
	>
		<HugeiconsIcon icon={Notification01Icon} size={20} color="currentColor" strokeWidth={2} />
		{#if unreadCount > 0}
			<span
				class="absolute -top-0.5 -right-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white"
			>
				{unreadCount > 99 ? '99+' : unreadCount}
			</span>
		{/if}
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			align="end"
			class="z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-lg"
			sideOffset={8}
		>
			<div class="flex items-center justify-between border-b border-border px-4 py-3">
				<h2 class="font-display text-sm font-semibold text-ink">Notifications</h2>
				{#if badgeCount > 0}
					<ButtonUi
						type="button"
						variant="ghost"
						class="h-8 px-2 text-xs"
						disabled={markingAll}
						onclick={markAllRead}
					>
						Mark all read
					</ButtonUi>
				{/if}
			</div>

			{#if showWrkspaceTab}
				<div class="flex border-b border-border px-2 pt-2">
					<button
						type="button"
						class="flex-1 rounded-t-md px-3 py-2 text-xs font-medium transition {tab === 'wrkspace'
							? 'border-b-2 border-accent text-accent'
							: 'text-ink-muted hover:text-ink'}"
						onclick={() => (tab = 'wrkspace')}
					>
						This wrkspace
						{#if wrkspaceUnreadCount > 0}
							<span class="ml-1 text-ink-muted">({wrkspaceUnreadCount})</span>
						{/if}
					</button>
					<button
						type="button"
						class="flex-1 rounded-t-md px-3 py-2 text-xs font-medium transition {tab === 'all'
							? 'border-b-2 border-accent text-accent'
							: 'text-ink-muted hover:text-ink'}"
						onclick={() => (tab = 'all')}
					>
						All wrkspaces
						{#if unreadCount > 0}
							<span class="ml-1 text-ink-muted">({unreadCount})</span>
						{/if}
					</button>
				</div>
			{/if}

			<ul class="max-h-[min(24rem,60vh)] overflow-y-auto">
				{#if displayNotifications.length === 0}
					<li class="px-4 py-8 text-center text-sm text-ink-muted">No notifications yet.</li>
				{:else}
					{#each displayNotifications as n (n.id)}
						{@const formatted = formatNotificationSummary(eventForDisplay(n), {
							teamSlug: n.teamSlug,
							wrkspaceSlug: n.wrkspaceSlug,
							moduleId: n.event.moduleId
						})}
						<li class="border-b border-border/60 last:border-b-0">
							<a
								href={formatted.href ?? '#'}
								class="flex gap-3 px-4 py-3 transition hover:bg-stone-50 {!n.readAt
									? 'bg-accent-muted/30'
									: ''}"
								onclick={() => handleNotificationClick(n)}
							>
								<Avatar
									src={n.event.actorImage}
									alt={n.event.actorName}
									fallback={initialsFromName(n.event.actorName)}
									class="size-8 shrink-0"
								/>
								<div class="min-w-0 flex-1">
									<p class="text-sm text-ink">
										{formatted.summary}
										{#if formatted.highlight}
											<span class="font-medium">{formatted.highlight}</span>
										{/if}
									</p>
									<p class="mt-0.5 truncate text-xs text-ink-muted">
										{n.wrkspaceName} · {formatRelativeTime(new Date(n.createdAt))}
									</p>
								</div>
								{#if !n.readAt}
									<span
										class="mt-2 size-2 shrink-0 rounded-full bg-accent"
										aria-label="Unread"
									></span>
								{/if}
							</a>
						</li>
					{/each}
				{/if}
			</ul>

			<div class="border-t border-border px-4 py-2">
				<a
					href="/settings/notifications"
					class="text-xs text-ink-muted transition hover:text-accent"
					onclick={() => (open = false)}
				>
					Notification settings
				</a>
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
