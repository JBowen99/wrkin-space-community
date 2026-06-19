<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Tooltip } from 'bits-ui';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import BrandMark from '$lib/components/brand/brand-mark.svelte';
	import UserAccountMenu from '$lib/components/user-account-menu.svelte';
	import DropdownMenu from '$lib/components/ui/dropdown-menu.svelte';
	import TooltipUi from '$lib/components/ui/tooltip.svelte';
	import NotificationBell from '$lib/components/notifications/notification-bell.svelte';
	import BookmarksPopover from '$lib/components/bookmarks/bookmarks-popover.svelte';
	import NotesPanel from '$lib/components/notes/notes-panel.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { CheckListIcon, StickyNoteIcon } from '@hugeicons/core-free-icons';
	import { initialsFromName } from '$lib/shared/initials';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let signOutForm: HTMLFormElement | undefined = $state();
	let notesPanelOpen = $state(false);

	const teamItems = $derived([
		{ label: 'All teams', href: '/teams' },
		...data.teams.map((t) => ({
			label: t.name,
			href: `/teams/${t.slug}`,
			active: t.slug === data.activeTeam?.slug,
			settingsHref: t.capabilities.manage_team ? `/teams/${t.slug}/settings` : undefined,
			settingsLabel: `${t.name} settings`
		}))
	]);

	const wrkspaceItems = $derived(
		data.activeTeam
			? [
					{
						label: 'All wrkspaces',
						href: `/teams/${data.activeTeam.slug}`,
						plainLabel: true
					},
					...data.wrkspaces.map((w) => ({
						label: w.name,
						href: `/teams/${data.activeTeam!.slug}/wrkspaces/${w.slug}`,
						active: w.slug === data.activeWrkspaceSlug,
						settingsHref: w.capabilities.manage_settings
							? `/teams/${data.activeTeam!.slug}/wrkspaces/${w.slug}/settings`
							: undefined,
						settingsLabel: `${w.name} settings`
					}))
				]
			: []
	);

	const moduleHref = $derived(
		data.activeTeam && data.activeWrkspaceSlug && data.activeModule
			? `/teams/${data.activeTeam.slug}/wrkspaces/${data.activeWrkspaceSlug}/modules/${data.activeModule.id}`
			: null
	);

	const isSelectionPage = $derived(
		page.url.pathname === '/teams' || /^\/teams\/[^/]+$/.test(page.url.pathname)
	);

	const hideBreadcrumb = $derived(page.url.pathname === '/teams');
</script>

<svelte:head>
	<title>App · wrkin.space</title>
	<meta name="description" content="wrkin.space workspace" />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<Tooltip.Provider delayDuration={400} skipDelayDuration={150}>
	<div class="flex min-h-screen flex-col">
		<header class="sticky top-0 z-50 border-b border-border bg-surface-raised">
			<div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-6">
				<div class="flex min-w-0 items-center gap-4">
					<a href="/" class="shrink-0 font-display text-lg font-semibold tracking-tight text-ink">
						<BrandMark />
					</a>

					{#if !hideBreadcrumb}
						<nav class="hidden min-w-0 items-center gap-1 text-sm sm:flex">
							{#if data.teams.length > 0}
								<DropdownMenu items={teamItems}>
									{#snippet trigger()}
										<span
											class="max-w-[8rem] truncate text-ink"
											title={data.activeTeam?.name ?? 'Team'}
										>
											{data.activeTeam?.name ?? 'Team'}
										</span>
										<span aria-hidden="true">▾</span>
									{/snippet}
								</DropdownMenu>
							{/if}

							{#if data.activeTeam && data.activeWrkspaceSlug && data.wrkspaces.length > 0}
								<span class="text-ink-muted/50">/</span>
								<DropdownMenu items={wrkspaceItems}>
									{#snippet trigger()}
										<span
											class="max-w-[10rem] truncate text-ink"
											title={data.activeWrkspace?.name ?? data.activeWrkspaceSlug}
										>
											{data.activeWrkspace?.name ?? data.activeWrkspaceSlug}
										</span>
										<span aria-hidden="true">▾</span>
									{/snippet}
								</DropdownMenu>
							{/if}

							{#if moduleHref && data.activeModule}
								{@const moduleTitle = data.activeModule.title}
								<span class="text-ink-muted/50">/</span>
								<TooltipUi text={moduleTitle}>
									{#snippet trigger(props)}
										<ButtonUi
											{...props}
											href={moduleHref}
											variant="unstyled"
											class="max-w-[10rem] truncate rounded-md px-2 py-1.5 font-medium text-accent"
										>
											{moduleTitle}
										</ButtonUi>
									{/snippet}
								</TooltipUi>
							{/if}
						</nav>
					{/if}
				</div>

				<div class="flex shrink-0 items-center gap-1">
					<TooltipUi text="Notes">
						{#snippet trigger(props)}
							<button
								{...props}
								class="inline-flex size-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none"
								type="button"
								onclick={() => (notesPanelOpen = !notesPanelOpen)}
							>
								<HugeiconsIcon
									icon={StickyNoteIcon}
									size={20}
									color="currentColor"
									strokeWidth={2}
								/>
							</button>
						{/snippet}
					</TooltipUi>
					<NotesPanel bind:open={notesPanelOpen} />
					<TooltipUi text="My Tasks">
						{#snippet trigger(props)}
							<a
								{...props}
								href="/my-tasks"
								class="inline-flex size-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none"
							>
								<HugeiconsIcon
									icon={CheckListIcon}
									size={20}
									color="currentColor"
									strokeWidth={2}
								/>
							</a>
						{/snippet}
					</TooltipUi>
					<BookmarksPopover activeWrkspaceId={data.activeWrkspaceId} />
					<NotificationBell
						notifications={data.notifications}
						unreadCount={data.unreadCount}
						wrkspaceUnreadCount={data.wrkspaceUnreadCount}
						activeWrkspaceId={data.activeWrkspaceId}
					/>
					<UserAccountMenu
						user={data.user}
						fallback={initialsFromName(data.user.name)}
						adminHref={data.isAdmin ? '/admin' : undefined}
						onSignOut={() => signOutForm?.requestSubmit()}
					/>
					<form
						bind:this={signOutForm}
						method="post"
						action="/logout?/signOut"
						use:enhance
						class="hidden"
						aria-hidden="true"
					></form>
				</div>
			</div>
		</header>

		<main
			class="mx-auto w-full flex-1 px-6 {isSelectionPage
				? 'flex flex-col items-center justify-start pt-16 pb-12 sm:pt-20'
				: 'max-w-7xl pt-5 pb-5'}"
		>
			{@render children()}
		</main>
	</div>
</Tooltip.Provider>
