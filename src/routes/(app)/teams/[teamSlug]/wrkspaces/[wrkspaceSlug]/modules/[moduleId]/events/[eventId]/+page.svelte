<script lang="ts">
	import type { PageData } from './$types';
	import CalendarEventDetail from '$lib/components/modules/calendar/calendar-event-detail.svelte';
	import { setBookmarkContext } from '$lib/components/bookmarks/bookmark-context.svelte';

	let { data }: { data: PageData } = $props();

	const bookmarkCtx = setBookmarkContext({
		teamSlug: data.wrkspace.teamSlug,
		wrkspaceSlug: data.wrkspace.slug,
		moduleId: data.module.id,
		moduleType: 'calendar',
		bookmarkedIds: data.bookmarkedIds
	});

	$effect(() => {
		bookmarkCtx.bookmarkedIds = data.bookmarkedIds ?? [];
	});
</script>

<CalendarEventDetail
	event={data.event}
	moduleIndexUrl={data.moduleIndexUrl}
	moduleTitle={data.module.title}
	typeLabel={data.typeLabel}
	moduleId={data.module.id}
	attachments={data.attachments}
	invitations={data.invitations}
	teamMembers={data.teamMembers}
	currentUserId={data.currentUserId}
/>
