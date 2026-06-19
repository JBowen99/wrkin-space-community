/** Default content when a cards board has no columns yet. */
export const DEFAULT_CARD_COLUMN_COLOR = '#a8a29e';
export const DEFAULT_INBOX_COLUMN_TITLE = 'Inbox';

export function cardColumnSurfaceStyle(color: string): string {
	return `border-color: color-mix(in srgb, ${color} 45%, #e2e8f0); background-color: color-mix(in srgb, ${color} 14%, #fff)`;
}

export function cardColumnHeaderStyle(color: string): string {
	return `background-color: color-mix(in srgb, ${color} 28%, #fff); border-bottom-color: color-mix(in srgb, ${color} 40%, #e2e8f0)`;
}
export const DEFAULT_WELCOME_CARD_TITLE = 'Welcome';
export const DEFAULT_WELCOME_CARD_BODY =
	'Drag cards between columns, add new ones, and reorder columns. Rename this card when you’re ready.';
