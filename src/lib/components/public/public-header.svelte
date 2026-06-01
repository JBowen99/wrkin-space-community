<script lang="ts">
	import { Button, NavigationMenu } from 'bits-ui';
	import BrandMark from '../brand/brand-mark.svelte';

	type Props = {
		user: { id: string } | null;
	};

	let { user }: Props = $props();

	const ctaHref = $derived(user ? '/teams' : '/login');
	const ctaLabel = $derived(user ? 'Get to wrk' : 'Get started');

	const navLink =
		'inline-flex w-max items-center justify-center rounded-lg px-4 py-2.5 text-lg font-medium text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 data-[state=open]:text-ink';

	const resourceLinks = [
		{ label: 'About', href: '/about' },
		{ label: 'Documentation', href: '/docs' },
		{ label: 'Self-hosting', href: '/docs/self-hosting' }
	];
</script>

<header class="bg-surface/80 backdrop-blur-sm">
	<div class="mx-auto grid h-24 max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-6">
		<a href="/" class="font-display text-2xl font-semibold tracking-tight text-ink">
			<BrandMark variant="wrkin.space" />
		</a>
		<nav class="hidden sm:block" aria-label="Main">
			<NavigationMenu.Root class="relative z-10 flex justify-center">
				<NavigationMenu.List class="flex list-none items-center gap-1 sm:gap-3">
					<NavigationMenu.Item>
						<NavigationMenu.Link href="/#features" class={navLink}>Features</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link href="/#how-it-works" class={navLink}
							>How it works</NavigationMenu.Link
						>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link href="/#pricing" class={navLink}>Pricing</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item value="resources" class="relative">
						<NavigationMenu.Trigger class="{navLink} group gap-1">
							Resources
							<span
								class="text-sm transition-transform duration-200 group-data-[state=open]:rotate-180"
								aria-hidden="true"
							>
								▾
							</span>
						</NavigationMenu.Trigger>
						<NavigationMenu.Content
							class="absolute top-full left-1/2 mt-2 min-w-[11rem] -translate-x-1/2 rounded-lg border border-border bg-surface-raised p-1 shadow-md"
						>
							<ul class="m-0 list-none p-0">
								{#each resourceLinks as link (link.href)}
									<li>
										<NavigationMenu.Link
											href={link.href}
											class="block rounded-md px-3 py-2 text-sm text-ink transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
										>
											{link.label}
										</NavigationMenu.Link>
									</li>
								{/each}
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>
		</nav>
		<div class="flex items-center justify-end gap-1 sm:gap-3">
			{#if !user}
				<Button.Root
					href="/login"
					class="rounded-lg px-4 py-2.5 text-lg font-medium text-ink-muted transition hover:text-ink"
				>
					Log in
				</Button.Root>
			{/if}
			<Button.Root
				href={ctaHref}
				class="rounded-lg bg-accent px-5 py-2.5 text-lg font-medium text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98]"
			>
				{ctaLabel}
			</Button.Root>
		</div>
	</div>
</header>
