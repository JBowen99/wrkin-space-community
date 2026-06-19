/** Shared layout for docs library grid cards (folders, docs, assets). */

/** Tile footprint in the library grid (3∶4), without bordered card chrome. */
export const docsLibraryCardSizeClass = 'group relative block aspect-[3/4] min-h-0 w-full';

export const docsLibraryCardSurfaceClass = `${docsLibraryCardSizeClass} flex flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm transition hover:border-accent/40 hover:shadow-md`;

export const docsLibraryCardMetaClass = 'px-0.5 text-[11px] leading-none text-ink-muted';
