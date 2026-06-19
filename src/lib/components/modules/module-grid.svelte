<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import {
		DndController,
		DndDraggable,
		DndDroppable,
		DndProvider,
		sortable
	} from '@horuse/svelte-dnd';
	import type { Component } from 'svelte';
	import type { WrkspaceModuleWithPreview } from '$lib/server/modules';
	import type { SubscriptionTier } from '$lib/shared/pricing';
	import ModuleCard from './module-card.svelte';
	import AddModuleCard from './add-module-card.svelte';
	import ModuleCardEntrance from './module-card-entrance.svelte';

	type Props = {
		modules: WrkspaceModuleWithPreview[];
		moduleHref: (moduleId: string) => string;
		tier?: SubscriptionTier;
		modulePicker?: typeof import('./module-picker-dialog.svelte').default;
		moduleCard?: Component<{ module: WrkspaceModuleWithPreview; href: string }>;
	};

	let {
		modules,
		moduleHref,
		tier = 'personal',
		modulePicker: ModulePickerDialog,
		moduleCard: ModuleCardComponent = ModuleCard
	}: Props = $props();

	const MODULES_GRID_ID = 'modules-grid';
	const MODULE_CARD_STAGGER_MS = 70;
	const ADD_MODULE_ENTRANCE_KEY = '__add-module__';
	const controller = new DndController();

	let items = $state<WrkspaceModuleWithPreview[]>([]);
	let pickerOpen = $state(false);

	/** Module ids present on first load — used to stagger only the initial grid, not newly added modules. */
	let initialModuleIds: Set<string> | null = null;

	/** Module ids (and add tile) that have already played the dashboard entrance animation. */
	const entranceDone = new Set<string>();

	function markEntranceDone(key: string) {
		entranceDone.add(key);
	}

	function entranceDelay(moduleId: string, index: number): number {
		if (initialModuleIds && !initialModuleIds.has(moduleId)) {
			return 0;
		}
		return index * MODULE_CARD_STAGGER_MS;
	}

	$effect(() => {
		const next = modules.map((mod) => ({ ...mod }));
		items = next;
		if (initialModuleIds === null && next.length > 0) {
			initialModuleIds = new Set(next.map((mod) => mod.id));
		}
	});

	function reorderItems(
		list: WrkspaceModuleWithPreview[],
		moduleId: string,
		targetPosition: number
	): WrkspaceModuleWithPreview[] {
		const fromIndex = list.findIndex((mod) => mod.id === moduleId);
		if (fromIndex === -1) return list;

		const next = list.map((mod) => ({ ...mod }));
		const [moved] = next.splice(fromIndex, 1);
		const pos = Math.max(0, Math.min(Math.floor(targetPosition), next.length));
		next.splice(pos, 0, moved);

		return next.map((mod, index) => ({ ...mod, position: index }));
	}

	async function postAction(action: string, fields: Record<string, string>): Promise<boolean> {
		const formData = new FormData();
		for (const [key, value] of Object.entries(fields)) {
			formData.set(key, value);
		}

		const response = await fetch(`?/${action}`, {
			method: 'POST',
			body: formData
		});

		const text = await response.text();
		const result = deserialize(text);

		if (result.type === 'failure') {
			return false;
		}

		await invalidateAll();
		return true;
	}

	onMount(() => {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion) {
			for (const mod of items) entranceDone.add(mod.id);
			entranceDone.add(ADD_MODULE_ENTRANCE_KEY);
		}

		const unsubscribe = controller.onDrop(async ({ item, source, target }) => {
			if (source.id !== MODULES_GRID_ID || target.id !== MODULES_GRID_ID) return;

			const previous = items.map((mod) => ({ ...mod }));
			items = reorderItems(items, item.id, target.position);

			const ok = await postAction('reorderModule', {
				moduleId: item.id,
				position: String(target.position)
			});

			if (!ok) items = previous;
		});

		return unsubscribe;
	});
</script>

<section class="module-grid" aria-label="wrkspace modules">
	<DndProvider {controller}>
		<DndDroppable
			id={MODULES_GRID_ID}
			strategy={sortable({ layout: 'grid' })}
			class="module-grid-dnd grid grid-cols-2 items-start gap-5 sm:grid-cols-3"
		>
			{#each items as mod, index (mod.id)}
				<DndDraggable
					id={mod.id}
					position={index}
					class="w-full cursor-grab self-start active:cursor-grabbing"
				>
					<ModuleCardEntrance
						play={!entranceDone.has(mod.id)}
						delay={entranceDelay(mod.id, index)}
						onComplete={() => markEntranceDone(mod.id)}
					>
						<ModuleCardComponent module={mod} href={moduleHref(mod.id)} />
					</ModuleCardEntrance>
				</DndDraggable>
			{/each}
			<ModuleCardEntrance
				play={!entranceDone.has(ADD_MODULE_ENTRANCE_KEY)}
				delay={items.length * MODULE_CARD_STAGGER_MS}
				onComplete={() => markEntranceDone(ADD_MODULE_ENTRANCE_KEY)}
			>
				<AddModuleCard onclick={() => (pickerOpen = true)} />
			</ModuleCardEntrance>
		</DndDroppable>
	</DndProvider>
</section>

{#if ModulePickerDialog}
	<ModulePickerDialog bind:open={pickerOpen} {tier} />
{/if}

<style>
	.module-grid {
		--dnd-preview-bg: color-mix(in srgb, var(--color-accent-muted) 50%, transparent);
		--dnd-preview-border: 2px dashed color-mix(in srgb, var(--color-accent) 45%, transparent);
		--dnd-preview-border-radius: 0.75rem;
	}

	.module-grid :global(.module-card-enter) {
		opacity: 0;
		transform: translateY(14px);
		animation: module-card-fade-up 480ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
	}

	/* Do not run entrance while dragging — DnD uses transform on the draggable wrapper */
	.module-grid:global(:has(.dnd-draggable--dragging)) :global(.module-card-enter) {
		animation: none;
		opacity: 1;
		transform: none;
	}

	@keyframes module-card-fade-up {
		from {
			opacity: 0;
			transform: translateY(14px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.module-grid :global(.module-card-enter) {
			animation: none;
		}
	}

	/* DnD tail preview + spacer nodes must not occupy grid cells */
	.module-grid :global(.module-grid-dnd > div:not([data-dnd-slot]):not(.module-grid-item)) {
		position: absolute;
		width: 0;
		height: 0;
		overflow: visible;
		pointer-events: none;
	}
</style>
