<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		/** When false, entrance has already played for this cell. */
		play: boolean;
		delay?: number;
		onComplete?: () => void;
		class?: string;
		children: Snippet;
	};

	let { play, delay = 0, onComplete, class: className = '', children }: Props = $props();

	let entranceComplete = $state(false);
	const animating = $derived(play && !entranceComplete);

	onMount(() => {
		if (!play) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			entranceComplete = true;
			onComplete?.();
		}
	});

	function finishEntrance() {
		if (entranceComplete) return;
		entranceComplete = true;
		onComplete?.();
	}
</script>

<div
	class="module-grid-item w-full self-start {className} {animating ? 'module-card-enter' : ''}"
	style={animating ? `animation-delay: ${delay}ms` : undefined}
	onanimationend={finishEntrance}
>
	{@render children()}
</div>
