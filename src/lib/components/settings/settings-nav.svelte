<script lang="ts">
	import { page } from '$app/stores';

	type NavItem = { label: string; href: string };

	let { items }: { items: NavItem[] } = $props();
</script>

<nav class="flex flex-wrap gap-2 border-b border-border pb-4">
	{#each items as item (item.href)}
		<a
			href={item.href}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {$page.url.pathname ===
			item.href
				? 'bg-ink/8 text-ink'
				: 'text-ink-muted hover:bg-ink/5 hover:text-ink'}"
		>
			{item.label}
		</a>
	{/each}
</nav>
