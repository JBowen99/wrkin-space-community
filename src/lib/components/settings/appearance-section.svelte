<script lang="ts">
	import { onMount } from 'svelte';
	import type { AppearancePreference } from '$lib/theme/appearance';
	import {
		applyAppearance,
		initAppearance,
		watchSystemAppearance
	} from '$lib/theme/apply-appearance';
	import Label from '../ui/label.svelte';
	import Select from '../ui/select.svelte';

	let preference = $state<AppearancePreference>('system');

	const options = [
		{ value: 'system', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];

	onMount(() => {
		preference = initAppearance();

		function onAppearanceChange(event: Event) {
			const detail = (event as CustomEvent<AppearancePreference>).detail;
			if (detail === 'light' || detail === 'dark' || detail === 'system') {
				preference = detail;
			}
		}

		window.addEventListener('wrkin-appearance-change', onAppearanceChange);
		const unwatch = watchSystemAppearance();
		return () => {
			window.removeEventListener('wrkin-appearance-change', onAppearanceChange);
			unwatch();
		};
	});

	function onPreferenceChange(value: string) {
		if (value !== 'light' && value !== 'dark' && value !== 'system') return;
		preference = value;
		applyAppearance(value);
	}
</script>

<div class="max-w-sm">
	<Label for="appearance-preference">Appearance</Label>
	<Select
		id="appearance-preference"
		{options}
		value={preference}
		onValueChange={onPreferenceChange}
		class="mt-1.5"
	/>
	<p class="text-ink-muted mt-1.5 text-sm">Choose light, dark, or match your device setting.</p>
</div>
