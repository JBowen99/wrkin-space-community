import mammoth from 'mammoth';
import {
	DOC_ASSET_PREVIEW_TEXT_DETAIL_MAX,
	fileExtension,
	truncatePreviewText
} from '../shared/doc-asset-preview';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TEXT_MIMES = new Set(['text/plain', 'text/markdown']);

function decodeUtf8(buffer: Buffer): string {
	return buffer.toString('utf8');
}

export async function extractDocAssetTextPreview(
	buffer: Buffer,
	mimeType: string | null,
	originalName: string | null
): Promise<string | null> {
	if (mimeType === DOCX_MIME) {
		try {
			const result = await mammoth.extractRawText({ buffer });
			const text = result.value.trim();
			return text ? truncatePreviewText(text, DOC_ASSET_PREVIEW_TEXT_DETAIL_MAX) : null;
		} catch {
			return null;
		}
	}

	const ext = fileExtension(originalName);
	const isTextMime = mimeType != null && TEXT_MIMES.has(mimeType);
	const isTextExt = ext != null && ['txt', 'md', 'markdown', 'csv', 'log', 'json'].includes(ext);

	if (!isTextMime && !isTextExt) {
		return null;
	}

	try {
		const text = decodeUtf8(buffer).trim();
		if (!text) return null;
		return truncatePreviewText(text, DOC_ASSET_PREVIEW_TEXT_DETAIL_MAX);
	} catch {
		return null;
	}
}
