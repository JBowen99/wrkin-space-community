export const TASK_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export const TASK_ATTACHMENT_ACCEPT =
	'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain';

export function formatAttachmentSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
