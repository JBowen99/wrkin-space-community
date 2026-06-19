/** Bordered container for plain (borderless) inputs and textareas — e.g. chat/forum composers. */
export const fieldShellClass =
	'overflow-hidden rounded-lg border border-border bg-surface-raised focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20';

export const fieldShellMarginClass = 'mt-1.5';

/** Standalone bordered text field (default Input / Textarea). */
export const defaultFieldClass =
	'w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none';

export const defaultFieldMarginClass = 'mt-1.5';

/** Borderless control inside a FieldShell. */
export const plainFieldClass =
	'block w-full border-0 bg-transparent px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none';

export const plainTextareaClass = `${plainFieldClass} resize-none leading-relaxed`;

/** Toolbar / inline row controls — no label offset, standard control height. */
export const toolbarControlClass = 'mt-0 box-border h-11 min-h-11 leading-normal';
