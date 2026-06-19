<script lang="ts">
	import { enhance } from '$app/forms';
	import DialogUi from '../ui/dialog.svelte';
	import ButtonUi from '../ui/button.svelte';

	type Props = {
		open?: boolean;
		moduleId: string;
		moduleTitle: string;
	};

	let { open = $bindable(false), moduleId, moduleTitle }: Props = $props();
</script>

<DialogUi
	bind:open
	title="Delete module?"
	description="All data in “{moduleTitle}” will be permanently deleted, including messages, events, cards, and any other content in this module. This cannot be undone."
>
	<form
		method="POST"
		action="?/deleteModule"
		use:enhance={() => {
			return async ({ update }) => {
				open = false;
				await update();
			};
		}}
	>
		<input type="hidden" name="moduleId" value={moduleId} />
		<div class="flex flex-wrap justify-end gap-2">
			<ButtonUi type="button" variant="secondary" onclick={() => (open = false)}>Cancel</ButtonUi>
			<ButtonUi type="submit" variant="ghost" class="text-danger hover:bg-danger-muted">
				Delete module
			</ButtonUi>
		</div>
	</form>
</DialogUi>
