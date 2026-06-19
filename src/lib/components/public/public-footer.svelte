<script lang="ts">
	import BrandMark from '../brand/brand-mark.svelte';

	type Props = {
		user: { id: string } | null;
	};

	let { user }: Props = $props();

	const footerLinks = $derived({
		product: user
			? [
					{ label: 'Features', href: '/#features' },
					{ label: 'Pricing', href: '/#pricing' },
					{ label: 'Get to wrk', href: '/teams' }
				]
			: [
					{ label: 'Features', href: '/#features' },
					{ label: 'Pricing', href: '/#pricing' },
					{ label: 'Get started', href: '/login' },
					{ label: 'Log in', href: '/login' }
				],
		resources: [
			{ label: 'Documentation', href: '/docs' },
			{ label: 'Product guides', href: '/docs/product' },
			{ label: 'Self-hosting', href: '/docs/self-hosting' },
			{ label: 'llms.txt', href: '/llms.txt' }
		],
		company: [
			{ label: 'About', href: '/about' },
			{ label: 'Privacy', href: '/privacy' },
			{ label: 'Terms', href: '/terms' },
			{ label: 'Contact', href: '/contact' }
		]
	});
</script>

<footer id="resources" class="bg-ink text-surface scroll-mt-20">
	<div class="mx-auto max-w-6xl px-6 py-12">
		<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-12">
			<div class="lg:col-span-2">
				<BrandMark
					variant="wrkin.space"
					monochrome
					class="font-display text-surface text-xl font-semibold tracking-tight"
				/>
				<p class="text-surface/70 mt-3 max-w-xs text-sm leading-relaxed">
					The operational home for your team. Modular workspaces, async-first collaboration, and
					software that stays out of your way.
				</p>
				<p class="text-surface/50 mt-4 text-xs leading-relaxed">
					Modular · Self-hostable · Calm by design
				</p>
			</div>

			{#each [{ title: 'Product', links: footerLinks.product }, { title: 'Resources', links: footerLinks.resources }, { title: 'Company', links: footerLinks.company }] as group (group.title)}
				<div>
					<h3 class="text-surface text-xs font-semibold tracking-wide uppercase">{group.title}</h3>
					<ul class="mt-4 space-y-2.5">
						{#each group.links as link (link.label)}
							<li>
								<a href={link.href} class="text-surface/65 hover:text-surface text-sm transition">
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div class="text-surface/60 mt-10 text-center text-sm sm:text-left">
			<p>
				© {new Date().getFullYear()}
				<BrandMark variant="wrkin.space" monochrome class="text-surface" />. All rights reserved.
			</p>
		</div>
	</div>
</footer>
