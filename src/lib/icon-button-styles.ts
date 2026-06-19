type IconBtnSize = 'sm' | 'md' | 'lg';
type IconBtnVariant = 'default' | 'subtle' | 'destructive';

const sizeClasses: Record<IconBtnSize, string> = {
	sm: 'size-5 rounded-sm [&>svg]:size-3',
	md: 'size-8 rounded-md [&>svg]:size-4',
	lg: 'size-9 rounded-lg [&>svg]:size-[18px]'
};

const variantClasses: Record<IconBtnVariant, string> = {
	default:
		'border border-dashed border-border text-ink-muted hover:border-accent/50 hover:bg-accent-muted/40 hover:text-accent focus:ring-2 focus:ring-accent/20',
	subtle: 'text-ink-muted hover:bg-surface-hover hover:text-ink',
	destructive: 'text-ink-muted hover:bg-danger-muted hover:text-danger'
};

const base =
	'inline-flex shrink-0 items-center justify-center transition focus:outline-none disabled:pointer-events-none disabled:opacity-40';

export function iconButtonClass(size: IconBtnSize = 'lg', variant: IconBtnVariant = 'default') {
	return `${base} ${sizeClasses[size]} ${variantClasses[variant]}`;
}
