<script lang="ts">
	import { getContext } from 'svelte';
	import { DndDroppable, target, type DndController } from '@horuse/svelte-dnd';
	import { cursorOver } from './docs-library-dnd';
	import type { DocsLibraryFolderRow } from '$lib/shared/docs-library';
	import { hasCustomDocFolderColor } from '$lib/shared/doc-folder-colors';
	import { docsLibraryCardMetaClass, docsLibraryCardSizeClass } from './docs-library-card-styles';

	type Props = {
		folder: DocsLibraryFolderRow;
		href: string;
		onShare?: () => void;
	};

	let { folder, href, onShare }: Props = $props();

	const dropId = $derived(`folder-${folder.id}`);
	const dndController = getContext<DndController>('dnd');
	const isDropTarget = $derived(
		Boolean(dndController?.dragging && dndController.dropPreview?.containerId === dropId)
	);
	const customColor = $derived(hasCustomDocFolderColor(folder.color));
	const folderColorStyle = $derived(
		customColor && folder.color ? `--folder-color: ${folder.color}` : undefined
	);

	function formatRelative(date: Date): string {
		const diffMs = date.getTime() - Date.now();
		const diffSec = Math.round(diffMs / 1000);
		const absSec = Math.abs(diffSec);
		const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

		if (absSec < 60) return rtf.format(diffSec, 'second');
		const diffMin = Math.round(diffSec / 60);
		if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
		const diffHr = Math.round(diffMin / 60);
		if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
		const diffDay = Math.round(diffHr / 24);
		if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
		const diffMonth = Math.round(diffDay / 30);
		return rtf.format(diffMonth, 'month');
	}

	/* Corner radius in viewBox units (~6 ≈ --radius-surface at typical card width). */
	const r = 6;

	/* Body right edge sits at x=84; the tab juts out to x=98 at the top,
	   then the edge cuts back in (to the left) down to the body edge. */
	const bodyPath = `M 2,${2 + r} Q 2,2 ${2 + r},2 L 88,2 Q 98,2 98,${2 + r} L 98,40 C 98,52 84,48 84,60 L 84,${131 - r} Q 84,131 ${84 - r},131 L ${2 + r},131 Q 2,131 2,${131 - r} Z`;
	/* Darker back panel: right-side band running the full height (top tab → bottom). */
	const tabPath = `M 70,2 L 88,2 Q 98,2 98,${2 + r} L 98,40 C 98,52 84,48 84,60 L 84,${131 - r} Q 84,131 ${84 - r},131 L 70,131 Z`;
	/* Smaller light front tab at the bottom: concave shoulder, leaves the dark band's
	   right edge + bottom-right corner showing. */
	const frontTabPath = 'M 58,131 L 58,60 C 66,60 76,64 76,74 L 76,131 Z';
</script>

<div class="flex w-full min-w-0 flex-col gap-1.5">
	{#if folder.canEdit}
		<DndDroppable
			id={dropId}
			strategy={target()}
			collision={cursorOver}
			accepts="library-item"
			class="min-h-0 w-full"
		>
			<a
				{href}
				draggable="false"
				ondragstart={(e) => e.preventDefault()}
				class="{docsLibraryCardSizeClass} folder-card"
				class:folder-card--custom={customColor}
				class:folder-card--drop-target={isDropTarget}
				style={folderColorStyle}
				aria-label="Open folder {folder.name}"
			>
				<svg
					class="folder-shape"
					viewBox="0 0 100 133"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<path class="folder-face" d={bodyPath} />
					<path class="folder-pocket" d={tabPath} />
					<path class="folder-face" d={frontTabPath} />
					<path class="folder-edge" d={bodyPath} />
				</svg>
				<h3
					class="folder-label text-ink group-hover:text-accent relative z-1 shrink-0 truncate p-3 pr-[30%] font-medium"
				>
					{folder.name}
				</h3>
			</a>
		</DndDroppable>
	{:else}
		<a
			{href}
			draggable="false"
			ondragstart={(e) => e.preventDefault()}
			class="{docsLibraryCardSizeClass} folder-card"
			class:folder-card--custom={customColor}
			style={folderColorStyle}
			aria-label="Open folder {folder.name}"
		>
			<svg class="folder-shape" viewBox="0 0 100 133" preserveAspectRatio="none" aria-hidden="true">
				<path class="folder-face" d={bodyPath} />
				<path class="folder-pocket" d={tabPath} />
				<path class="folder-face" d={frontTabPath} />
				<path class="folder-edge" d={bodyPath} />
			</svg>
			<h3
				class="folder-label text-ink group-hover:text-accent relative z-1 shrink-0 truncate p-3 pr-[30%] font-medium"
			>
				{folder.name}
			</h3>
		</a>
	{/if}
	<div class="flex items-center justify-between gap-2 {docsLibraryCardMetaClass}">
		{#if onShare && folder.canManageSharing}
			<button
				type="button"
				data-dnd-no-drag
				class="text-ink-muted hover:text-accent min-w-0 truncate text-left underline-offset-2 hover:underline"
				onclick={(e) => {
					e.preventDefault();
					onShare();
				}}
			>
				{folder.restricted ? 'Sharing (restricted)' : 'Sharing'}
			</button>
		{:else}
			<span class="min-w-0" aria-hidden="true"></span>
		{/if}
		<span class="text-ink-muted shrink-0">{formatRelative(folder.updatedAt)}</span>
	</div>
</div>

<style>
	.folder-card {
		text-decoration: none;
		filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.08));
		transition:
			filter 0.15s ease,
			transform 0.15s ease;
	}

	.folder-card:hover {
		filter: drop-shadow(0 4px 10px rgb(0 0 0 / 0.12));
		transform: translateY(-2px);
	}

	.folder-card:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
		border-radius: var(--radius-surface);
	}

	.folder-card--drop-target {
		outline: 2px dashed color-mix(in srgb, var(--color-accent) 55%, transparent);
		outline-offset: 3px;
		border-radius: var(--radius-surface);
	}

	.folder-shape {
		position: absolute;
		inset: 0;
		display: block;
		height: 100%;
		width: 100%;
	}

	.folder-face {
		fill: var(--folder-face);
	}

	.folder-pocket {
		fill: var(--folder-pocket);
	}

	.folder-edge {
		fill: none;
		stroke: var(--folder-edge);
		stroke-width: 1.25;
		vector-effect: non-scaling-stroke;
	}

	/* Light: manila folder */
	.folder-card {
		--folder-face: #d9b882;
		--folder-pocket: #b8956a;
		--folder-edge: #b8956a;
	}

	.folder-card--custom {
		--folder-face: var(--folder-color);
		--folder-pocket: color-mix(in srgb, var(--folder-color) 72%, #000);
		--folder-edge: color-mix(in srgb, var(--folder-color) 72%, #000);
	}

	/* Dark: warm folder tones on raised surface */
	:global(html[data-appearance='dark']) .folder-card {
		--folder-face: color-mix(in srgb, #d9b882 40%, var(--color-surface-raised));
		--folder-pocket: color-mix(in srgb, #8f7045 50%, var(--color-surface-raised));
		--folder-edge: color-mix(in srgb, #8f7045 70%, var(--color-border));
	}

	:global(html[data-appearance='dark']) .folder-card--custom {
		--folder-face: color-mix(in srgb, var(--folder-color) 40%, var(--color-surface-raised));
		--folder-pocket: color-mix(in srgb, var(--folder-color) 50%, var(--color-surface-raised));
		--folder-edge: color-mix(in srgb, var(--folder-color) 70%, var(--color-border));
	}
</style>
