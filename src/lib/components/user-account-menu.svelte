<script lang="ts">
	import { onMount } from 'svelte';
	import type { AppearancePreference } from '$lib/theme/appearance';
	import { applyAppearance, initAppearance } from '$lib/theme/apply-appearance';
	import Avatar from './ui/avatar.svelte';
	import DropdownMenu from './ui/dropdown-menu.svelte';

	type Props = {
		user: { name: string; image?: string | null };
		fallback: string;
		adminHref?: string;
		onSignOut: () => void;
	};

	let { user, fallback, adminHref, onSignOut }: Props = $props();

	let preference = $state<AppearancePreference>('system');

	onMount(() => {
		preference = initAppearance();

		function onAppearanceChange(event: Event) {
			const detail = (event as CustomEvent<AppearancePreference>).detail;
			if (detail === 'light' || detail === 'dark' || detail === 'system') {
				preference = detail;
			}
		}

		window.addEventListener('wrkin-appearance-change', onAppearanceChange);
		return () => window.removeEventListener('wrkin-appearance-change', onAppearanceChange);
	});

	function setAppearance(next: AppearancePreference) {
		preference = next;
		applyAppearance(next);
	}

	const appearanceOptions: { value: AppearancePreference; label: string }[] = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'system', label: 'System' }
	];

	const menuItems = $derived([
		{ label: 'Appearance', disabled: true, plainLabel: true },
		...appearanceOptions.map((option) => ({
			label: option.label,
			plainLabel: true,
			active: preference === option.value,
			onclick: () => setAppearance(option.value)
		})),
		...(adminHref ? [{ label: 'Admin', href: adminHref, separatorBefore: true }] : []),
		{ label: 'Settings', href: '/settings', separatorBefore: !adminHref },
		{
			label: 'Log out',
			destructive: true,
			separatorBefore: true,
			onclick: onSignOut
		}
	]);
</script>

<DropdownMenu align="end" triggerClass="gap-2 px-2" items={menuItems}>
	{#snippet trigger()}
		<Avatar src={user.image} alt={user.name} {fallback} />
		<span class="text-ink-muted hidden max-w-[12rem] truncate text-sm sm:inline">
			{user.name}
		</span>
		<span class="text-ink-muted/70" aria-hidden="true">▾</span>
	{/snippet}
</DropdownMenu>
