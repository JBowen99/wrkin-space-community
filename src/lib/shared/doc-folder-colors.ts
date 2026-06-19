import { isHexColor, normalizeHexColor } from './tasks-colors';

/** Default manila folder (matches library folder card fallback). */
export const DEFAULT_DOC_FOLDER_COLOR = '#d9b882';

export function parseDocFolderColor(raw: string | null | undefined): string | null {
	if (raw == null || raw === '') return null;
	return normalizeHexColor(raw);
}

export function resolveDocFolderColor(color: string | null | undefined): string {
	const parsed = color ? parseDocFolderColor(color) : null;
	return parsed ?? DEFAULT_DOC_FOLDER_COLOR;
}

/** True when stored color is a valid custom hex (not relying on default). */
export function hasCustomDocFolderColor(color: string | null | undefined): boolean {
	return parseDocFolderColor(color) !== null;
}
