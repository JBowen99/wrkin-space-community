<script lang="ts">
	import { Popover } from 'bits-ui';
	import ColorPicker from '../../ui/color-picker.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import { resolveTaskColor, type TaskModuleSettingsData } from '$lib/shared/tasks-colors';
	import {
		taskPriorityLabel,
		taskStatusLabel,
		type TaskPriority,
		type TaskStatus
	} from '$lib/shared/tasks';

	type Props = {
		colorMode?: 'module' | 'custom';
		customColorValue?: string;
		taskModuleSettings: TaskModuleSettingsData;
		status: TaskStatus;
		priority: TaskPriority;
	};

	let {
		colorMode = $bindable('module'),
		customColorValue = $bindable('#3b82f6'),
		taskModuleSettings,
		status,
		priority
	}: Props = $props();

	let open = $state(false);

	const moduleColor = $derived(
		resolveTaskColor({ status, priority, customColor: null }, taskModuleSettings)
	);
	const displayColor = $derived(colorMode === 'custom' ? customColorValue : moduleColor);
	const moduleDescription = $derived(
		taskModuleSettings.colorBy === 'status'
			? `By ${taskStatusLabel(status).toLowerCase()}`
			: `By ${taskPriorityLabel(priority).toLowerCase()} priority`
	);

	function selectModule() {
		colorMode = 'module';
		open = false;
	}

	function selectCustom() {
		colorMode = 'custom';
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		type="button"
		aria-label="Task color"
		aria-haspopup="dialog"
		aria-expanded={open}
		class="hover:bg-surface-hover focus-visible:ring-accent/20 shrink-0 rounded-md p-1 transition focus-visible:ring-2 focus-visible:outline-none"
	>
		<span
			class="block size-6 rounded-md border border-black/10 shadow-inner ring-1 ring-black/5"
			style:background-color={displayColor}
			aria-hidden="true"
		></span>
	</Popover.Trigger>

	<Popover.Portal>
		<Popover.Content
			class="border-border bg-surface-raised z-50 w-56 rounded-lg border p-2 shadow-md"
			sideOffset={6}
			align="start"
		>
			<p class="text-ink-muted px-2 py-1 text-xs font-medium">Color</p>

			<ButtonUi
				type="button"
				variant="unstyled"
				class="hover:bg-surface-hover flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition {colorMode ===
				'module'
					? 'bg-accent-muted/40'
					: ''}"
				onclick={selectModule}
			>
				<span
					class="size-5 shrink-0 rounded-md border border-black/10 shadow-inner ring-1 ring-black/5"
					style:background-color={moduleColor}
					aria-hidden="true"
				></span>
				<span class="min-w-0 flex-1">
					<span class="text-ink block font-medium">Module settings</span>
					<span class="text-ink-muted block text-xs">{moduleDescription}</span>
				</span>
			</ButtonUi>

			<div
				class="hover:bg-surface-hover mt-0.5 flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition {colorMode ===
				'custom'
					? 'bg-accent-muted/40'
					: ''}"
			>
				<div
					class="shrink-0"
					onclick={(e) => e.stopPropagation()}
					onpointerdown={() => selectCustom()}
				>
					<ColorPicker
						bind:value={customColorValue}
						compact
						ariaLabel="Custom task color"
						class="!mt-0"
					/>
				</div>
				<button type="button" class="min-w-0 flex-1 text-left" onclick={selectCustom}>
					<span class="text-ink block font-medium">Custom color</span>
					<span class="text-ink-muted block text-xs">Pick a fixed color</span>
				</button>
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
