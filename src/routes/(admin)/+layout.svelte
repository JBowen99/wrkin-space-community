<script lang="ts">
	import BrandMark from '$lib/components/brand/brand-mark.svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/state';

	let { data: _data, children }: { data: LayoutData; children: import('svelte').Snippet } =
		$props();

	const navItems = [
		{ label: 'Overview', href: '/admin' },
		{ label: 'Users', href: '/admin/users' },
		{ label: 'Teams', href: '/admin/teams' }
	];

	const currentPath = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>Admin · wrkin.space</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex min-h-screen flex-col bg-surface-muted">
	<header class="border-b border-border bg-surface-raised">
		<div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
			<div class="flex items-center gap-6">
				<a href="/" class="shrink-0 font-display text-lg font-semibold tracking-tight text-ink">
					<BrandMark />
				</a>
				<span class="rounded-md bg-ink px-2 py-0.5 text-xs font-medium text-white">Admin</span>
			</div>
			<nav class="flex items-center gap-1 text-sm">
				{#each navItems as item (item.href)}
					<a
						href={item.href}
						class="rounded-lg px-3 py-1.5 font-medium transition-colors {currentPath ===
							item.href ||
						(item.href !== '/admin' && currentPath.startsWith(item.href))
							? 'bg-surface-inset/80 text-ink'
							: 'text-ink-muted hover:text-ink'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>
			<div class="flex items-center gap-3">
				<a
					href="/teams"
					class="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
				>
					Back to app
				</a>
			</div>
		</div>
	</header>

	<main class="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
		{@render children()}
	</main>
</div>
