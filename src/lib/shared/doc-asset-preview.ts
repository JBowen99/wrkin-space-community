export const DOC_ASSET_PREVIEW_TEXT_CARD_MAX = 600;
export const DOC_ASSET_PREVIEW_TEXT_DETAIL_MAX = 8000;

export type DocAssetPreviewMode = 'link-image' | 'image' | 'pdf' | 'text' | 'icon';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'csv', 'log', 'json']);

export function fileExtension(name: string | null | undefined): string | null {
	if (!name) return null;
	const dot = name.lastIndexOf('.');
	if (dot < 0 || dot === name.length - 1) return null;
	return name.slice(dot + 1).toLowerCase();
}

export function getDocAssetPreviewMode(
	kind: 'upload' | 'link',
	mimeType: string | null,
	fileName?: string | null
): DocAssetPreviewMode {
	if (kind === 'link') {
		return 'link-image';
	}

	if (mimeType?.startsWith('image/')) {
		return 'image';
	}

	if (mimeType === 'application/pdf') {
		return 'pdf';
	}

	if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
		return 'text';
	}

	if (mimeType === DOCX_MIME) {
		return 'text';
	}

	const ext = fileExtension(fileName);
	if (ext && TEXT_EXTENSIONS.has(ext)) {
		return 'text';
	}

	return 'icon';
}

export function truncatePreviewText(text: string, maxLen: number): string {
	const trimmed = text.replace(/\s+/g, ' ').trim();
	if (trimmed.length <= maxLen) return trimmed;
	return `${trimmed.slice(0, maxLen - 1)}…`;
}
