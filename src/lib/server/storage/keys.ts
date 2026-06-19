export function docImageKey(docId: string, filename: string): string {
	return `docs/${docId}/${filename}`;
}

export function docsAssetKey(moduleId: string, assetId: string, ext: string): string {
	return `docs-assets/${moduleId}/${assetId}${ext}`;
}

export function taskAttachmentKey(taskId: string, attachmentId: string, ext: string): string {
	return `tasks/${taskId}/${attachmentId}${ext}`;
}

export function chatAttachmentKey(messageId: string, attachmentId: string, ext: string): string {
	return `chat/${messageId}/${attachmentId}${ext}`;
}

export function forumAttachmentKey(postId: string, attachmentId: string, ext: string): string {
	return `forum/${postId}/${attachmentId}${ext}`;
}

export function calendarAttachmentKey(eventId: string, attachmentId: string, ext: string): string {
	return `calendar/${eventId}/${attachmentId}${ext}`;
}
