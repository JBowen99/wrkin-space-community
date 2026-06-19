<script lang="ts">
	import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Button, NavigationMenu } from 'bits-ui';
	import BrandMark from '../brand/brand-mark.svelte';

	type Props = {
		user: { id: string } | null;
		featuresFeaturedImage?: string;
		resourcesFeaturedImage?: string;
	};

	type NavMenuLink = {
		title: string;
		href: string;
		description: string;
	};

	type NavMenuPanel = {
		featured: NavMenuLink;
		links: NavMenuLink[];
	};

	let {
		user,
		featuresFeaturedImage = '/landing/hero-gradient.webp',
		resourcesFeaturedImage = '/landing/hero-gradient-community.webp'
	}: Props = $props();

	const ctaHref = $derived(user ? '/teams' : '/login');
	const ctaLabel = $derived(user ? 'Get to wrk' : 'Get started');

	const navTrigger =
		'group inline-flex w-max items-center justify-center gap-1 rounded-lg px-4 py-2.5 text-lg font-medium text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 data-[state=open]:text-ink';

	const navLink =
		'inline-flex w-max items-center justify-center rounded-lg px-4 py-2.5 text-lg font-medium text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

	const menuItemLink =
		'hover:bg-surface-hover focus-visible:bg-surface-hover block space-y-1.5 rounded-lg p-3 leading-none no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40';

	const featuredLink =
		'group relative outline-hidden flex h-full min-h-[12.5rem] w-full min-w-0 select-none flex-col justify-end overflow-hidden rounded-lg p-6 no-underline focus-visible:ring-2 focus-visible:ring-accent/40';

	const contentPosition = 'absolute top-0 left-0 w-[42rem] max-w-[calc(100vw-2rem)]';

	const viewportClass =
		'border-border bg-surface-raised relative z-10 mt-2.5 h-[var(--bits-navigation-menu-viewport-height)] w-[var(--bits-navigation-menu-viewport-width)] min-w-[42rem] max-w-[calc(100vw-2rem)] origin-[top_center] overflow-hidden rounded-xl border shadow-lg transition-[width,height] duration-200 data-[state=closed]:animate-scale-out data-[state=open]:animate-scale-in';

	const featuresMenu: NavMenuPanel = {
		featured: {
			title: 'All features',
			href: '/features',
			description: 'Nine modules and platform capabilities — enable only what each wrkspace needs.'
		},
		links: [
			{
				title: 'Tasks',
				href: '/features#tasks',
				description: 'Kanban, Gantt, tags, links, and comments for day-to-day delivery.'
			},
			{
				title: 'Docs',
				href: '/features#docs',
				description: 'Collaborative pages with folders, uploads, and external links.'
			},
			{
				title: 'Templates',
				href: '/features#templates',
				description: 'Start wrkspaces and modules from curated presets instead of blank slates.'
			}
		]
	};

	const resourcesMenu: NavMenuPanel = {
		featured: {
			title: 'Documentation',
			href: '/docs',
			description: 'Product guides, self-hosting walkthroughs, and setup references.'
		},
		links: [
			{
				title: 'About',
				href: '/about',
				description: 'What wrkin.space is and how we think about calm collaboration.'
			},
			{
				title: 'Product guides',
				href: '/docs/product',
				description: 'How teams, wrkspaces, and modules work together.'
			},
			{
				title: 'Self-hosting',
				href: '/docs/self-hosting',
				description: 'Run wrkin.space on your own infrastructure with Docker.'
			}
		]
	};
</script>

<svelte:head>
	<link rel="preload" as="image" href={featuresFeaturedImage} />
	<link rel="preload" as="image" href={resourcesFeaturedImage} />
</svelte:head>

{#snippet navMenuItem(link: NavMenuLink)}
	<li class="min-w-0">
		<NavigationMenu.Link href={link.href} class={menuItemLink}>
			<div class="text-sm font-medium leading-none text-ink">{link.title}</div>
			<p class="text-ink-muted text-sm leading-snug">{link.description}</p>
		</NavigationMenu.Link>
	</li>
{/snippet}

{#snippet navMenuPanel(panel: NavMenuPanel, featuredImage: string)}
	<ul
		class="m-0 grid w-[42rem] max-w-[calc(100vw-2rem)] list-none grid-cols-2 grid-rows-3 gap-x-4 p-5"
	>
		<li class="col-start-1 row-span-3 min-w-0">
			<NavigationMenu.Link href={panel.featured.href} class={featuredLink}>
				<img
					src={featuredImage}
					alt=""
					class="pointer-events-none absolute inset-0 h-full w-full object-cover"
					width="1536"
					height="1024"
					decoding="async"
				/>
				<div
					class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/5"
					aria-hidden="true"
				></div>
				<div class="relative z-10">
					<div class="font-display flex items-center gap-1.5 text-lg font-semibold text-white">
						{panel.featured.title}
						<HugeiconsIcon
							icon={ArrowRight01Icon}
							class="size-4 shrink-0 text-white/85 transition-transform group-hover:translate-x-0.5"
							aria-hidden="true"
						/>
					</div>
					<p class="mt-2 text-sm leading-relaxed text-white/85">{panel.featured.description}</p>
				</div>
			</NavigationMenu.Link>
		</li>
		{#each panel.links as link (link.href)}
			{@render navMenuItem(link)}
		{/each}
	</ul>
{/snippet}

<header class="overflow-visible bg-surface/80 backdrop-blur-sm">
	<div
		class="mx-auto grid h-24 max-w-5xl grid-cols-[1fr_auto_1fr] items-center overflow-visible px-6"
	>
		<a href="/" class="font-display text-2xl font-semibold tracking-tight text-ink">
			<BrandMark variant="wrkin.space" />
		</a>
		<nav class="hidden overflow-visible sm:block" aria-label="Main">
			<NavigationMenu.Root class="relative z-10 flex w-full justify-center">
				<NavigationMenu.List class="flex list-none items-center gap-1 sm:gap-3">
					<NavigationMenu.Item value="features">
						<NavigationMenu.Trigger class={navTrigger}>
							Features
							<span
								class="text-sm transition-transform duration-200 group-data-[state=open]:rotate-180"
								aria-hidden="true"
							>
								▾
							</span>
						</NavigationMenu.Trigger>
						<NavigationMenu.Content class={contentPosition}>
							{@render navMenuPanel(featuresMenu, featuresFeaturedImage)}
						</NavigationMenu.Content>
					</NavigationMenu.Item>

					<NavigationMenu.Item value="resources">
						<NavigationMenu.Trigger class={navTrigger}>
							Resources
							<span
								class="text-sm transition-transform duration-200 group-data-[state=open]:rotate-180"
								aria-hidden="true"
							>
								▾
							</span>
						</NavigationMenu.Trigger>
						<NavigationMenu.Content class={contentPosition}>
							{@render navMenuPanel(resourcesMenu, resourcesFeaturedImage)}
						</NavigationMenu.Content>
					</NavigationMenu.Item>

					<NavigationMenu.Item>
						<NavigationMenu.Link href="/#pricing" class={navLink}>Pricing</NavigationMenu.Link>
					</NavigationMenu.Item>

					<NavigationMenu.Indicator
						class="top-full -mt-1 flex h-3.5 items-end justify-center overflow-hidden opacity-100 transition-[all,transform_250ms_ease] duration-200 data-[state=hidden]:animate-fade-out data-[state=visible]:animate-fade-in data-[state=hidden]:opacity-0"
					>
						<div
							class="bg-surface-raised border-border relative top-[70%] size-3.5 rotate-45 rounded-tl-[2px] border border-b-0 border-r-0"
						></div>
					</NavigationMenu.Indicator>
				</NavigationMenu.List>

				<div class="perspective-[2000px] absolute top-full left-0 flex w-full justify-center">
					<NavigationMenu.Viewport class={viewportClass} />
				</div>
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
				class="bg-accent hover:bg-accent-hover rounded-lg px-5 py-2.5 text-lg font-medium text-white shadow-sm transition active:scale-[0.98]"
			>
				{ctaLabel}
			</Button.Root>
		</div>
	</div>
</header>
