<script lang="ts">
	import { Popover } from 'bits-ui';
	import ButtonUi from './button.svelte';
	import Input from './input.svelte';
	import { COLOR_PRESETS } from '$lib/shared/color-palette';
	import { clamp01, hexToHsl, hslToHex } from '$lib/shared/color-utils';
	import { isHexColor, normalizeHexColor } from '$lib/shared/tasks-colors';
	import { cn } from '../../cn';

	const HUE_SLIDER_GRADIENT =
		'linear-gradient(to right, #f00 0%, #ff0 16.67%, #0f0 33.33%, #0ff 50%, #00f 66.67%, #f0f 83.33%, #f00 100%)';

	type Props = {
		id?: string;
		name?: string;
		value?: string;
		disabled?: boolean;
		compact?: boolean;
		class?: string;
		ariaLabel?: string;
	};

	let {
		id,
		name,
		value = $bindable('#a8a29e'),
		disabled = false,
		compact = false,
		class: className = '',
		ariaLabel = 'Choose color'
	}: Props = $props();

	let open = $state(false);
	let customHex = $state('');
	let customError = $state(false);

	let slAreaEl = $state<HTMLDivElement | null>(null);
	let hueSliderEl = $state<HTMLDivElement | null>(null);

	let hue = $state(0);
	let saturation = $state(0);
	let lightness = $state(50);

	const displayHex = $derived(value.toLowerCase());
	const hueBackground = $derived(`hsl(${hue} 100% 50%)`);
	const slThumbLeft = $derived(`${saturation}%`);
	const slThumbTop = $derived(`${100 - lightness}%`);
	const hueThumbLeft = $derived(`${(hue / 360) * 100}%`);

	function syncHslFromHex(hex: string) {
		const hsl = hexToHsl(hex);
		if (!hsl) return;
		hue = hsl.h;
		saturation = hsl.s;
		lightness = hsl.l;
	}

	function commitHsl() {
		const hex = hslToHex(hue, saturation, lightness);
		value = hex;
		customHex = hex;
		customError = false;
	}

	function selectPreset(hex: string) {
		value = hex;
		open = false;
	}

	function onHexInput() {
		const normalized = normalizeHexColor(customHex);
		if (!normalized) {
			customError = customHex.trim().length > 0;
			return;
		}
		value = normalized;
		customHex = normalized;
		customError = false;
		syncHslFromHex(normalized);
	}

	function handleCustomKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			onHexInput();
		}
	}

	function updateSlFromPointer(event: PointerEvent) {
		const el = slAreaEl;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		saturation = clamp01((event.clientX - rect.left) / rect.width) * 100;
		lightness = (1 - clamp01((event.clientY - rect.top) / rect.height)) * 100;
		commitHsl();
	}

	function updateHueFromPointer(event: PointerEvent) {
		const el = hueSliderEl;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		hue = clamp01((event.clientX - rect.left) / rect.width) * 360;
		commitHsl();
	}

	function startSlDrag(event: PointerEvent) {
		const el = slAreaEl;
		if (!el) return;
		el.setPointerCapture(event.pointerId);
		updateSlFromPointer(event);

		const onMove = (moveEvent: PointerEvent) => updateSlFromPointer(moveEvent);
		const onUp = (upEvent: PointerEvent) => {
			el.releasePointerCapture(upEvent.pointerId);
			el.removeEventListener('pointermove', onMove);
			el.removeEventListener('pointerup', onUp);
			el.removeEventListener('pointercancel', onUp);
		};

		el.addEventListener('pointermove', onMove);
		el.addEventListener('pointerup', onUp);
		el.addEventListener('pointercancel', onUp);
	}

	function startHueDrag(event: PointerEvent) {
		const el = hueSliderEl;
		if (!el) return;
		el.setPointerCapture(event.pointerId);
		updateHueFromPointer(event);

		const onMove = (moveEvent: PointerEvent) => updateHueFromPointer(moveEvent);
		const onUp = (upEvent: PointerEvent) => {
			el.releasePointerCapture(upEvent.pointerId);
			el.removeEventListener('pointermove', onMove);
			el.removeEventListener('pointerup', onUp);
			el.removeEventListener('pointercancel', onUp);
		};

		el.addEventListener('pointermove', onMove);
		el.addEventListener('pointerup', onUp);
		el.addEventListener('pointercancel', onUp);
	}

	$effect(() => {
		if (!open) return;
		customHex = displayHex;
		customError = false;
		syncHslFromHex(displayHex);
	});
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		{id}
		{disabled}
		type="button"
		aria-label={ariaLabel}
		aria-haspopup="dialog"
		aria-expanded={open}
		class={cn(
			'border-border bg-surface-raised text-ink hover:border-accent/40 focus-visible:border-accent focus-visible:ring-accent/20 inline-flex items-center justify-between gap-2 rounded-lg border text-left text-sm transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
			compact ? 'h-9 shrink-0 px-2' : 'mt-1.5 h-10 w-full px-3 py-2',
			className
		)}
	>
		<span class="flex min-w-0 items-center gap-2">
			<span
				class="size-5 shrink-0 rounded-md border border-black/10 shadow-inner ring-1 ring-black/5"
				style:background-color={value}
				aria-hidden="true"
			></span>
			{#if !compact}
				<span class="truncate font-mono text-xs tracking-wide uppercase">{displayHex}</span>
			{/if}
		</span>
		<span aria-hidden="true" class="text-ink-muted shrink-0">▾</span>
	</Popover.Trigger>

	<Popover.Portal>
		<Popover.Content
			class="border-border bg-surface-raised z-50 w-[15.5rem] rounded-lg border p-3 shadow-md"
			sideOffset={6}
			align="start"
		>
			<p class="text-ink-muted mb-2 text-xs font-medium">Presets</p>
			<div class="grid grid-cols-8 gap-1.5" role="listbox" aria-label="Color presets">
				{#each COLOR_PRESETS as preset (preset.value)}
					{@const selected = displayHex === preset.value}
					<ButtonUi
						variant="unstyled"
						role="option"
						aria-selected={selected}
						aria-label={preset.label}
						title={preset.label}
					class={cn(
						'focus-visible:ring-accent relative size-7 rounded-md border-2 transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
						selected ? 'border-ink' : 'border-transparent'
					)}
						style="background-color: {preset.value}"
						onclick={() => selectPreset(preset.value)}
					>
						{#if selected}
							<span
								class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm"
								aria-hidden="true"
							>
								✓
							</span>
						{/if}
					</ButtonUi>
				{/each}
			</div>

			<div class="border-border mt-3 border-t pt-3">
				<p class="text-ink-muted mb-2 text-xs font-medium">Custom</p>

				<div
					bind:this={slAreaEl}
					role="slider"
					tabindex="0"
					aria-label="Saturation and lightness"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(saturation)}
					class="border-border relative h-28 w-full cursor-crosshair touch-none overflow-hidden rounded-lg border select-none"
					style:background-color={hueBackground}
					onpointerdown={startSlDrag}
				>
					<div
						class="pointer-events-none absolute inset-0 bg-linear-to-r from-white to-transparent"
						aria-hidden="true"
					></div>
					<div
						class="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent to-black"
						aria-hidden="true"
					></div>
					<div
						class="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/20"
						style:left={slThumbLeft}
						style:top={slThumbTop}
						aria-hidden="true"
					></div>
				</div>

				<div
					bind:this={hueSliderEl}
					role="slider"
					tabindex="0"
					aria-label="Hue"
					aria-valuemin={0}
					aria-valuemax={360}
					aria-valuenow={Math.round(hue)}
					class="border-border relative mt-2 h-3 w-full cursor-pointer touch-none rounded-full border select-none"
					style:background={HUE_SLIDER_GRADIENT}
					onpointerdown={startHueDrag}
				>
					<div
						class="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/20"
						style:left={hueThumbLeft}
						aria-hidden="true"
					></div>
				</div>

				<div class="mt-2 flex items-center gap-2">
					<span
						class="border-border size-8 shrink-0 rounded-lg border shadow-inner ring-1 ring-black/5"
						style:background-color={value}
						aria-hidden="true"
					></span>
					<Input
						type="text"
						placeholder="#3b82f6"
						bind:value={customHex}
						class="!mt-0 flex-1 font-mono text-xs uppercase"
						aria-invalid={customError}
						aria-label="Hex color"
						oninput={onHexInput}
						onkeydown={handleCustomKeydown}
					/>
				</div>
				{#if customError}
					<p class="text-danger mt-1 text-xs">Enter a valid hex color (e.g. #3b82f6).</p>
				{/if}
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

{#if name}
	<input type="hidden" {name} value={isHexColor(value) ? value : displayHex} />
{/if}
