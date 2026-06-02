<script lang="ts">
	import Avatar from '../../ui/avatar.svelte';
	import Tooltip from '../../ui/tooltip.svelte';
	import type { CollabUser } from '$lib/shared/collab-user';
	import { collabUserInitials } from '$lib/shared/collab-user';

	type Props = {
		users: CollabUser[];
		currentUserId: string;
	};

	let { users, currentUserId }: Props = $props();

	const others = $derived(users.filter((u) => u.id !== currentUserId));
	const self = $derived(users.find((u) => u.id === currentUserId));
</script>

{#if users.length > 0}
	<div class="flex items-center -space-x-1.5" aria-live="polite">
		{#each others as user (user.clientId)}
			<Tooltip text={user.name} side="bottom">
				{#snippet trigger(props)}
					<span
						{...props}
						class="rounded-full ring-2 ring-surface"
						style="box-shadow: 0 0 0 2px {user.color}"
					>
						<Avatar
							src={user.image}
							alt={user.name}
							fallback={collabUserInitials(user.name)}
							class="size-7"
						/>
					</span>
				{/snippet}
			</Tooltip>
		{/each}

		{#if self}
			<Tooltip text="{self.name} (you)" side="bottom">
				{#snippet trigger(props)}
					<span
						{...props}
						class="rounded-full ring-2 ring-surface"
						style="box-shadow: 0 0 0 2px {self.color}"
					>
						<Avatar
							src={self.image}
							alt={self.name}
							fallback={collabUserInitials(self.name)}
							class="size-7"
						/>
					</span>
				{/snippet}
			</Tooltip>
		{/if}
	</div>
{/if}
