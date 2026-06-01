/** Theme tokens are applied on <html>; skip during SSR. */
export function themeRoot(): HTMLElement | null {
	return typeof document !== 'undefined' ? document.documentElement : null;
}
