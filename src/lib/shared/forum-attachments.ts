export {
	TASK_ATTACHMENT_ACCEPT as FORUM_ATTACHMENT_ACCEPT,
	TASK_ATTACHMENT_MAX_BYTES as FORUM_ATTACHMENT_MAX_BYTES,
	formatAttachmentSize
} from './task-attachments';

export const FORUM_ATTACHMENT_MAX_PER_POST = 5;

export function isImageMimeType(mimeType: string): boolean {
	return mimeType.startsWith('image/');
}
