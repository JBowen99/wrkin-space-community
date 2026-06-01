export {
	TASK_ATTACHMENT_ACCEPT as CHAT_ATTACHMENT_ACCEPT,
	TASK_ATTACHMENT_MAX_BYTES as CHAT_ATTACHMENT_MAX_BYTES,
	formatAttachmentSize
} from './task-attachments';

export const CHAT_ATTACHMENT_MAX_PER_MESSAGE = 5;

export function isImageMimeType(mimeType: string): boolean {
	return mimeType.startsWith('image/');
}
