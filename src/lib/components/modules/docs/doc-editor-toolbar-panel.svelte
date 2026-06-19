<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	type TriggerArgs = {
		toggle: () => void;
		open: boolean;
	};

	type Props = {
		open?: boolean;
		trigger: Snippet<[TriggerArgs]>;
		content: Snippet;
		onOpen?: () => void;
		onClose?: () => void;
	};

	let { open = $bindable(false), trigger, content, onOpen, onClose }: Props = $props();

	let anchor = $state<HTMLElement | null>(null);
	let panelEl = $state<HTMLElement | null>(null);
	let panelStyle = $state('');

	const panelId = `doc-toolbar-panel-${Math.random().toString(36).slice(2, 9)}`;

	function updatePosition() {
		if (!anchor || !open) return;
		const rect = anchor.getBoundingClientRect();
		const maxLeft = Math.max(8, window.innerWidth - 280);
		const left = Math.min(Math.max(8, rect.left), maxLeft);
		panelStyle = `position:fixed;top:${rect.bottom + 6}px;left:${left}px;z-index:9999;`;
	}

	function toggle() {
		if (open) {
			close();
		} else {
			open = true;
			onOpen?.();
			queueMicrotask(updatePosition);
		}
	}

	function close() {
		if (!open) return;
		open = false;
		onClose?.();
	}

	function onDocumentPointerDown(e: PointerEvent) {
		if (!open) return;
		const target = e.target as Node;
		if (anchor?.contains(target)) return;
		if (panelEl?.contains(target)) return;
		close();
	}

	$effect(() => {
		if (!open) return;
		updatePosition();
		const onLayout = () => updatePosition();
		window.addEventListener('scroll', onLayout, true);
		window.addEventListener('resize', onLayout);
		return () => {
			window.removeEventListener('scroll', onLayout, true);
			window.removeEventListener('resize', onLayout);
		};
	});

	onMount(() => {
		document.addEventListener('pointerdown', onDocumentPointerDown);
		return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
	});
</script>

<div class="inline-flex" bind:this={anchor}>
	{@render trigger({ toggle, open })}
</div>

{#if open}
	<div
		id={panelId}
		bind:this={panelEl}
		style={panelStyle}
		class="doc-toolbar-panel border-border bg-surface-raised rounded-lg border p-2 shadow-lg"
		role="dialog"
		tabindex="-1"
		onpointerdown={(e) => e.stopPropagation()}
	>
		{@render content()}
	</div>
{/if}
