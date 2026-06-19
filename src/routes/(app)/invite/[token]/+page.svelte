<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import SelectionPage from '$lib/shared/selection-page.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';

	let { form }: { form: ActionData } = $props();
</script>

<SelectionPage title="Team invite" description="Accept an invitation to join a team.">
	<form method="POST" action="?/accept" use:enhance class="mt-6 space-y-4">
		{#if form?.message}
			<p class="text-sm text-danger" role="alert">{form.message}</p>
		{/if}
		<ButtonUi type="submit">Accept invite</ButtonUi>
	</form>
</SelectionPage>
