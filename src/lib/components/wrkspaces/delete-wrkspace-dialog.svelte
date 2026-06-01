<script lang="ts">
	import { enhance } from '$app/forms';
	import DialogUi from '../ui/dialog.svelte';
	import ButtonUi from '../ui/button.svelte';

	type Props = {
		open?: boolean;
		name: string;
	};

	let { open = $bindable(false), name }: Props = $props();
</script>

<DialogUi
	bind:open
	title="Delete wrkspace?"
	description="All modules and data in “{name}” will be permanently deleted. This cannot be undone."
>
	<form
		method="POST"
		action="?/deleteWrkspace"
		use:enhance={() => {
			return async ({ update }) => {
				open = false;
				await update();
			};
		}}
	>
		<div class="flex flex-wrap justify-end gap-2">
			<ButtonUi type="button" variant="secondary" onclick={() => (open = false)}>Cancel</ButtonUi>
			<ButtonUi type="submit" variant="ghost" class="text-red-700 hover:bg-red-50">
				Delete wrkspace
			</ButtonUi>
		</div>
	</form>
</DialogUi>
