<script lang="ts">
	type Props = {
		size?: 'preview' | 'page';
	};

	let { size = 'page' }: Props = $props();

	const compact = $derived(size === 'preview');
</script>

<div
	class="flex w-full flex-col {compact ? 'justify-center gap-2' : 'gap-4'}"
	aria-hidden={compact}
>
	<div class="flex flex-col gap-2">
		<div
			class="skeleton-hatch border-border/50 rounded border border-dashed {compact
				? 'h-3 w-28'
				: 'h-4 w-40'}"
		></div>
		<div
			class="skeleton-hatch border-border/40 rounded border border-dashed {compact
				? 'h-2.5 w-20'
				: 'h-3 w-56'}"
		></div>
		<div
			class="skeleton-hatch border-border/40 rounded border border-dashed {compact
				? 'h-2 w-3/5'
				: 'h-2.5 w-72 max-w-full'}"
		></div>
	</div>

	<div class="grid grid-cols-2 {compact ? 'mt-0.5 gap-1.5' : 'mt-1 gap-3'}">
		<!-- Pie / donut sketch -->
		<div
			class="border-border/60 bg-surface/40 flex min-h-0 flex-col rounded-xl border border-dashed p-1.5 {compact
				? 'aspect-[5/4]'
				: 'min-h-44 p-3'}"
		>
			<div
				class="skeleton-hatch border-border/40 mb-1 rounded border border-dashed {compact
					? 'h-1.5 w-10'
					: 'h-2 w-14'}"
			></div>
			<svg
				viewBox="0 0 100 72"
				class="min-h-0 w-full flex-1"
				role="img"
				aria-label="Chart placeholder"
			>
				<defs>
					<pattern
						id="report-empty-hatch-pie"
						width="6"
						height="6"
						patternUnits="userSpaceOnUse"
						patternTransform="rotate(-42)"
					>
						<line
							x1="0"
							y1="0"
							x2="0"
							y2="6"
							stroke="color-mix(in srgb, var(--color-border) 45%, transparent)"
							stroke-width="1"
						/>
					</pattern>
				</defs>

				<!-- Donut segments -->
				<path
					d="M 50 36 L 50 8 A 28 28 0 0 1 74.2 48.2 Z"
					fill="url(#report-empty-hatch-pie)"
					stroke="color-mix(in srgb, var(--color-border) 70%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>
				<path
					d="M 50 36 L 74.2 48.2 A 28 28 0 0 1 25.8 48.2 Z"
					fill="url(#report-empty-hatch-pie)"
					stroke="color-mix(in srgb, var(--color-border) 70%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>
				<path
					d="M 50 36 L 25.8 48.2 A 28 28 0 0 1 50 8 Z"
					fill="url(#report-empty-hatch-pie)"
					stroke="color-mix(in srgb, var(--color-border) 70%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>
				<!-- Inner hole -->
				<circle cx="50" cy="36" r="14" fill="var(--color-surface-raised, var(--color-surface))" />
				<circle
					cx="50"
					cy="36"
					r="14"
					fill="none"
					stroke="color-mix(in srgb, var(--color-border) 55%, transparent)"
					stroke-width="1"
					stroke-dasharray="2 2"
				/>
				<!-- Legend ticks -->
				<line
					x1="8"
					y1="62"
					x2="14"
					y2="62"
					stroke="color-mix(in srgb, var(--color-border) 50%, transparent)"
					stroke-width="1"
					stroke-dasharray="2 2"
				/>
				<rect
					x="16"
					y="60"
					width="12"
					height="3"
					rx="1"
					fill="url(#report-empty-hatch-pie)"
					stroke="color-mix(in srgb, var(--color-border) 50%, transparent)"
					stroke-width="0.75"
				/>
				<line
					x1="34"
					y1="62"
					x2="40"
					y2="62"
					stroke="color-mix(in srgb, var(--color-border) 50%, transparent)"
					stroke-width="1"
					stroke-dasharray="2 2"
				/>
				<rect
					x="42"
					y="60"
					width="12"
					height="3"
					rx="1"
					fill="url(#report-empty-hatch-pie)"
					stroke="color-mix(in srgb, var(--color-border) 50%, transparent)"
					stroke-width="0.75"
				/>
			</svg>
		</div>

		<!-- Bar chart sketch -->
		<div
			class="border-border/60 bg-surface/40 flex min-h-0 flex-col rounded-xl border border-dashed p-1.5 {compact
				? 'aspect-[5/4]'
				: 'min-h-44 p-3'}"
		>
			<div
				class="skeleton-hatch border-border/40 mb-1 rounded border border-dashed {compact
					? 'h-1.5 w-10'
					: 'h-2 w-14'}"
			></div>
			<svg
				viewBox="0 0 100 72"
				class="min-h-0 w-full flex-1"
				role="img"
				aria-label="Chart placeholder"
			>
				<defs>
					<pattern
						id="report-empty-hatch-bar"
						width="6"
						height="6"
						patternUnits="userSpaceOnUse"
						patternTransform="rotate(-42)"
					>
						<line
							x1="0"
							y1="0"
							x2="0"
							y2="6"
							stroke="color-mix(in srgb, var(--color-border) 45%, transparent)"
							stroke-width="1"
						/>
					</pattern>
				</defs>

				<!-- Axes -->
				<line
					x1="8"
					y1="8"
					x2="8"
					y2="54"
					stroke="color-mix(in srgb, var(--color-border) 55%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>
				<line
					x1="8"
					y1="54"
					x2="94"
					y2="54"
					stroke="color-mix(in srgb, var(--color-border) 55%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>

				<!-- Grid lines -->
				<line
					x1="8"
					y1="38"
					x2="94"
					y2="38"
					stroke="color-mix(in srgb, var(--color-border) 30%, transparent)"
					stroke-width="0.75"
					stroke-dasharray="2 3"
				/>
				<line
					x1="8"
					y1="23"
					x2="94"
					y2="23"
					stroke="color-mix(in srgb, var(--color-border) 30%, transparent)"
					stroke-width="0.75"
					stroke-dasharray="2 3"
				/>

				<!-- Bars -->
				<rect
					x="16"
					y="30"
					width="10"
					height="24"
					rx="1.5"
					fill="url(#report-empty-hatch-bar)"
					stroke="color-mix(in srgb, var(--color-border) 65%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>
				<rect
					x="30"
					y="42"
					width="10"
					height="12"
					rx="1.5"
					fill="url(#report-empty-hatch-bar)"
					stroke="color-mix(in srgb, var(--color-border) 65%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>
				<rect
					x="44"
					y="18"
					width="10"
					height="36"
					rx="1.5"
					fill="url(#report-empty-hatch-bar)"
					stroke="color-mix(in srgb, var(--color-border) 65%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>
				<rect
					x="58"
					y="34"
					width="10"
					height="20"
					rx="1.5"
					fill="url(#report-empty-hatch-bar)"
					stroke="color-mix(in srgb, var(--color-border) 65%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>
				<rect
					x="72"
					y="26"
					width="10"
					height="28"
					rx="1.5"
					fill="url(#report-empty-hatch-bar)"
					stroke="color-mix(in srgb, var(--color-border) 65%, transparent)"
					stroke-width="1"
					stroke-dasharray="3 2"
				/>

				<!-- Trend line overlay -->
				<polyline
					points="21,36 35,44 49,24 63,32 77,28"
					fill="none"
					stroke="color-mix(in srgb, var(--color-border) 75%, transparent)"
					stroke-width="1.25"
					stroke-dasharray="4 3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<circle
					cx="21"
					cy="36"
					r="1.75"
					fill="var(--color-surface-raised, var(--color-surface))"
					stroke="color-mix(in srgb, var(--color-border) 75%, transparent)"
					stroke-width="1"
				/>
				<circle
					cx="49"
					cy="24"
					r="1.75"
					fill="var(--color-surface-raised, var(--color-surface))"
					stroke="color-mix(in srgb, var(--color-border) 75%, transparent)"
					stroke-width="1"
				/>
				<circle
					cx="77"
					cy="28"
					r="1.75"
					fill="var(--color-surface-raised, var(--color-surface))"
					stroke="color-mix(in srgb, var(--color-border) 75%, transparent)"
					stroke-width="1"
				/>
			</svg>
		</div>
	</div>
</div>

<style>
	.skeleton-hatch {
		background-color: color-mix(in srgb, var(--color-surface) 88%, var(--color-border));
		background-image: repeating-linear-gradient(
			-42deg,
			transparent 0,
			transparent 5px,
			color-mix(in srgb, var(--color-border) 28%, transparent) 5px,
			color-mix(in srgb, var(--color-border) 28%, transparent) 6px
		);
	}
</style>
